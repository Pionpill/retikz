import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import { RetikzError } from '@retikz/foundation';

import type { CompileOptions } from '../compile';
import { formatCompileWarning } from '../compile';
import { compileScene } from '../compile/execution';
import { createCompileRuntime } from '../compile/runtime';
import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import type { WeaveBatch, WeavePreparedUpdate } from '../weave';
import { WeaveManager } from '../weave';
import {
  ReconcilerLifecyclePhase,
  ReconcilerMode,
  ReconcilerStatus,
  ReconcilerTraceUnit,
  ReconcilerUpdateStrategy,
} from './constants';
import type { ReconcilerPreparedCommit, ReconcilerResult, SceneReconcilerOptions } from './types';

/** 同步协调编译与一个输出目标，不依赖 DOM 或 Runtime 注册图 */
export class SceneReconciler<const TComposite extends AnyCompositeDefinition = never> {
  private current: ReconcilerResult<TComposite> | undefined;
  private weave: WeaveManager<TComposite> | undefined;
  private status: ReconcilerStatus = ReconcilerStatus.Idle;
  /** 输出目标清理是否已成功完成；无清理回调也视为完成，失败时保持 false 以允许重试 */
  private targetDisposed = false;
  /** 已挂载会话等待成功清理的观测记录，清理失败时保留以供重试 */
  private pendingUnmount = false;
  /** 已隔离的观察或资源释放异常，读取后清空 */
  private readonly diagnosticQueue: Array<unknown> = [];

  /** 从当前执行选项读取模式，不重复保存派生状态 */
  private get mode(): ReconcilerMode {
    return this.execution.incremental === false ? ReconcilerMode.Full : ReconcilerMode.Incremental;
  }

  constructor(
    private options: CompileOptions<TComposite> = {},
    private readonly execution: SceneReconcilerOptions<TComposite> = {},
  ) {}

  /** 首次建立计算状态并发布完整结果 */
  mount(source: IRScene): ReconcilerResult<TComposite> {
    this.assertIdle();
    if (this.current !== undefined) throw this.contractError('Session is already mounted');
    return this.replace(source);
  }

  /** 显式完整重建，准备失败仍保留原计算状态 */
  replace(source: IRScene, options = this.options): ReconcilerResult<TComposite> {
    this.assertIdle();
    const phase = this.current === undefined ? ReconcilerLifecyclePhase.Mount : ReconcilerLifecyclePhase.Update;
    this.status = ReconcilerStatus.Preparing;
    try {
      let weave: WeaveManager<TComposite> | undefined;
      let compilation: ReconcilerResult<TComposite>['compilation'];
      let traceUnit: ReconcilerTraceUnit;
      let visited: number;
      if (this.mode === ReconcilerMode.Full) {
        compilation = compileScene<TComposite>(source, createCompileRuntime(source, options, this.execution));
        traceUnit = ReconcilerTraceUnit.SceneCompile;
        visited = 1;
      } else {
        weave = new WeaveManager(source, options, this.execution);
        const prepared = weave.mount();
        compilation = prepared.compilation;
        traceUnit = ReconcilerTraceUnit.ElementCompile;
        visited = prepared.visited;
      }
      const candidate: ReconcilerResult<TComposite> = {
        revision: this.nextRevision(),
        compilation,
      };
      const published = this.publish(candidate, weave, undefined, options);
      this.options = options;
      this.reportTrace(phase, 'full', traceUnit, visited);
      return published;
    } catch (cause) {
      if (cause instanceof RetikzError) throw cause;
      throw new RetikzReconcilerError({
        code: RetikzReconcilerErrorCode.Compile,
        message: 'Failed to prepare the compilation',
        cause,
      });
    } finally {
      this.endUpdate();
    }
  }

  /** 使用权威基础元素批次更新；期望结果按对象身份绑定会话与版本 */
  update(batch: WeaveBatch, expected: ReconcilerResult<TComposite> = this.read()): ReconcilerResult<TComposite> {
    this.assertIdle();
    if (expected !== this.current) throw this.contractError('The update belongs to a stale session result');
    if (this.weave === undefined) throw this.contractError('Non-incremental sessions do not support Weave batches');
    if (batch.operations.length === 0 && this.execution.updateStrategy !== ReconcilerUpdateStrategy.Full)
      return expected;
    this.status = ReconcilerStatus.Preparing;
    try {
      const prepared = this.weave.update(batch, this.execution.updateStrategy === ReconcilerUpdateStrategy.Full);
      const published = this.publish(
        { revision: this.nextRevision(), compilation: prepared.compilation },
        this.weave,
        prepared,
      );
      this.reportTrace(
        ReconcilerLifecyclePhase.Update,
        this.execution.updateStrategy === ReconcilerUpdateStrategy.Full ? 'full' : 'incremental',
        ReconcilerTraceUnit.ElementCompile,
        prepared.visited,
      );
      return published;
    } finally {
      this.endUpdate();
    }
  }

  /** 复用编译结果，仅准备并提交输出目标的新配置 */
  updateTarget(): ReconcilerResult<TComposite> {
    this.assertIdle();
    const current = this.read();
    this.status = ReconcilerStatus.Preparing;
    try {
      return this.publish({ ...current, revision: this.nextRevision() }, this.weave);
    } finally {
      this.endUpdate();
    }
  }

  /** 读取已发布结果；准备期间仍返回旧结果，提交期间拒绝重入 */
  read(): ReconcilerResult<TComposite> {
    if (
      this.status === ReconcilerStatus.Committing ||
      this.status === ReconcilerStatus.Broken ||
      this.status === ReconcilerStatus.Disposed
    )
      throw this.contractError(`Cannot read a ${this.status} session`);
    if (this.current === undefined) throw this.contractError('Session is not mounted');
    return this.current;
  }

  /**
   * 查询当前已发布作者树中的作用域标识，仅允许空闲的增量会话调用
   * @param path 从根开始逐层选择 children 的下标；空路径表示根，每一步必须指向作者 Scope
   * @param expected 路径所属的当前结果，旧结果或其它会话的结果会被拒绝
   * @returns 容器存续期间稳定的标识，可用于批次的 scopeId 或 parentId；完整替换后需重新查询
   */
  getScopeId(path: ReadonlyArray<number> = [], expected: ReconcilerResult<TComposite> = this.read()): string {
    this.assertIdle();
    if (expected !== this.current) throw this.contractError('The scope query belongs to a stale session result');
    if (this.weave === undefined) throw this.contractError('Non-incremental sessions do not expose scope addresses');
    return this.weave.getScopeId(path);
  }

  /** 读取并清空非致命诊断 */
  diagnostics(): ReadonlyArray<unknown> {
    return this.diagnosticQueue.splice(0);
  }

  /** 释放计算与宿主资源；允许在恢复失败后清理 */
  dispose(): void {
    if (this.targetDisposed) return;
    if (this.status === ReconcilerStatus.Preparing || this.status === ReconcilerStatus.Committing)
      throw this.contractError('Cannot dispose an active update');
    this.status = ReconcilerStatus.Disposed;
    this.pendingUnmount ||= this.current !== undefined;
    this.current = undefined;
    this.weave = undefined;
    try {
      this.execution.target?.dispose?.();
      this.targetDisposed = true;
      if (this.pendingUnmount) {
        this.pendingUnmount = false;
        this.reportTrace(ReconcilerLifecyclePhase.Unmount, 'dispose', ReconcilerTraceUnit.Session, 1);
      }
    } catch (cause) {
      this.diagnosticQueue.push({
        code: 'RECONCILER_CLEANUP_FAILED',
        phase: 'dispose',
        severity: 'error',
        message: 'Failed to dispose the output target',
        cause,
      });
    }
  }

  /** 保留两侧恢复依据，直到双方均提交成功 */
  private publish(
    candidate: ReconcilerResult<TComposite>,
    weave: WeaveManager<TComposite> | undefined,
    prepared?: WeavePreparedUpdate<TComposite>,
    options = this.options,
  ): ReconcilerResult<TComposite> {
    let target: ReconcilerPreparedCommit | undefined;
    try {
      target = this.execution.target?.prepare(candidate, this.current);
      this.status = ReconcilerStatus.Committing;
      prepared?.commit();
      target?.commit();
    } catch (cause) {
      const recoveryErrors: Array<unknown> = [];
      try {
        target?.rollback();
      } catch (error) {
        recoveryErrors.push(error);
      }
      try {
        prepared?.rollback();
      } catch (error) {
        recoveryErrors.push(error);
      }
      this.releaseCommit(target);
      if (recoveryErrors.length > 0) {
        this.status = ReconcilerStatus.Broken;
        throw new RetikzReconcilerError({
          code: RetikzReconcilerErrorCode.Contract,
          message: 'Failed to restore the previous committed result',
          cause,
          details: { recoveryErrors },
        });
      }
      if (cause instanceof RetikzError) throw cause;
      throw new RetikzReconcilerError({
        code: RetikzReconcilerErrorCode.Compile,
        message: 'Failed to publish the compilation',
        cause,
      });
    }
    prepared?.finish();
    const previous = this.current;
    this.current = candidate;
    this.weave = weave;
    this.releaseCommit(target);
    if (previous?.compilation !== candidate.compilation) {
      for (const warning of candidate.compilation.diagnostics) {
        try {
          if (options.onWarn !== undefined) options.onWarn(warning);
          else if (__DEV__) console.warn(formatCompileWarning(warning));
        } catch (cause) {
          this.diagnosticQueue.push(cause);
        }
      }
    }
    return candidate;
  }

  /** 观测失败不能改变已经发布的编译结果 */
  private reportTrace(
    phase: ReconcilerLifecyclePhase,
    outcome: 'full' | 'incremental' | 'dispose',
    unit: ReconcilerTraceUnit,
    visited: number,
  ): void {
    try {
      this.execution.trace?.({
        owner: 'kernel/reconciler',
        phase,
        unit,
        outcome,
        visited,
        reused: 0,
        changed: visited,
      });
    } catch (cause) {
      this.diagnosticQueue.push({
        code: 'RECONCILER_TRACE_FAILED',
        phase: 'trace',
        severity: 'warning',
        message: 'Trace callback failed',
        cause,
      });
    }
  }

  /** 清理失败不撤销已提交结果 */
  private releaseCommit(target: ReconcilerPreparedCommit | undefined): void {
    try {
      target?.dispose();
    } catch (cause) {
      this.diagnosticQueue.push(cause);
    }
  }

  /** 结束本次调用，恢复失败的会话继续保持阻断 */
  private endUpdate(): void {
    if (this.status !== ReconcilerStatus.Broken && this.status !== ReconcilerStatus.Disposed)
      this.status = ReconcilerStatus.Idle;
  }

  private assertIdle(): void {
    if (this.status !== ReconcilerStatus.Idle) throw this.contractError(`Cannot update a ${this.status} session`);
  }

  private nextRevision(): number {
    const revision = (this.current?.revision ?? -1) + 1;
    if (!Number.isSafeInteger(revision)) throw this.contractError('Session revision exhausted');
    return revision;
  }

  private contractError(message: string): RetikzReconcilerError {
    return new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, message);
  }
}
