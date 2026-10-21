import { formatCompileWarning, prepareSceneCompilation } from '@retikz/core';
import type {
  AnyCompositeDefinition,
  CompileOptions,
  IRScene,
  PreparedSceneCompilation,
  SceneCompilationPreparationOptions,
} from '@retikz/core';
import { RetikzError } from '@retikz/foundation';
import type { PerformanceTraceSink } from '@retikz/foundation';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from './error';
import { isWeaveScene, WeaveReconciler } from './weave';
import type { WeaveBatch, WeavePreparedUpdate, WeaveRoot } from './weave';

/** 同一会话发布的完整编译结果 */
export type ReconcilerResult = Readonly<{
  /** 会话内的已提交版本，首次发布为零 */
  revision: number;
  /** Core 的完整编译产物，不强制生成渲染快照 */
  compilation: PreparedSceneCompilation<ReadonlyArray<AnyCompositeDefinition>>;
  /** 基础元素场景的稳定根，Composite 完整编译不提供此字段 */
  root?: WeaveRoot;
}>;

/** 宿主准备完成后的修改与恢复能力 */
export type ReconcilerPreparedCommit = Readonly<{
  /** 应用宿主修改，失败时仍须允许 rollback */
  commit: () => void;
  /** 放弃准备或恢复本次尚未最终确认的修改 */
  rollback: () => void;
  /** 释放临时资源，不改变成功发布的画面 */
  dispose: () => void;
}>;

/** 可选的单个输出提交目标，由 Render 或其它结果消费者实现 */
export type ReconcilerCommitTarget = Readonly<{
  /** 准备本次完整输出，不发布宿主修改 */
  prepare: (candidate: ReconcilerResult, previous: ReconcilerResult | undefined) => ReconcilerPreparedCommit;
  /** 释放目标拥有的长期资源 */
  dispose?: () => void;
}>;

/** 编译会话的输出接线 */
export type ReconcilerSessionOptions = SceneCompilationPreparationOptions &
  Readonly<{
    /** 可选宿主目标；省略时仅提交计算状态 */
    target?: ReconcilerCommitTarget;
    /** 基础批次是否强制重算全部元素，完整输入替换始终完整编译 */
    updateStrategy?: ReconcilerUpdateStrategy;
    /** 已提交编译的实际元素编译次数；不代表树遍历或图元修改次数 */
    trace?: PerformanceTraceSink;
  }>;

/** 同步协调编译与一个输出目标，不依赖 DOM 或 Runtime 注册图 */
export class ReconcilerSession {
  private targetDisposed = false;
  private current: ReconcilerResult | undefined;
  private weave: WeaveReconciler | undefined;
  private status: 'idle' | 'preparing' | 'committing' | 'broken' | 'disposed' = 'idle';
  /** 已隔离的观察或资源释放异常，读取后清空 */
  private readonly diagnosticQueue: Array<unknown> = [];

  constructor(
    private options: CompileOptions<ReadonlyArray<AnyCompositeDefinition>> = {},
    private readonly execution: ReconcilerSessionOptions = {},
  ) {}

  /** 首次建立计算状态并发布完整结果 */
  mount(source: IRScene): ReconcilerResult {
    this.assertIdle();
    if (this.current !== undefined) throw this.contractError('Session is already mounted');
    return this.replace(source);
  }

  /** 显式完整重建，准备失败仍保留原计算状态 */
  replace(source: IRScene, options = this.options): ReconcilerResult {
    this.assertIdle();
    this.status = 'preparing';
    try {
      const weave = isWeaveScene(source) ? new WeaveReconciler(source, options, this.execution) : undefined;
      const prepared = weave?.mount();
      let compilationCount = 0;
      const compilation =
        prepared?.compilation ??
        prepareSceneCompilation(
          source,
          {
            ...options,
            trace: {
              report: record => {
                compilationCount = record.visited;
              },
            },
          },
          this.execution,
        );
      const candidate: ReconcilerResult = {
        revision: this.nextRevision(),
        compilation,
        ...(prepared === undefined ? {} : { root: prepared.root }),
      };
      const published = this.publish(candidate, weave, undefined, options);
      this.options = options;
      this.reportTrace('full', prepared?.visited ?? compilationCount);
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
  update(batch: WeaveBatch, expected: ReconcilerResult = this.read()): ReconcilerResult {
    this.assertIdle();
    if (expected !== this.current) throw this.contractError('The update belongs to a stale session result');
    if (this.weave === undefined) throw this.contractError('Composite scenes do not support Weave batches');
    if (batch.operations.length === 0) return expected;
    this.status = 'preparing';
    try {
      const prepared = this.weave.update(batch, this.execution.updateStrategy === 'full');
      const published = this.publish(
        { revision: this.nextRevision(), compilation: prepared.compilation, root: prepared.root },
        this.weave,
        prepared,
      );
      this.reportTrace(this.execution.updateStrategy === 'full' ? 'full' : 'incremental', prepared.visited);
      return published;
    } finally {
      this.endUpdate();
    }
  }

  /** 复用编译结果，仅准备并提交输出目标的新配置 */
  updateTarget(): ReconcilerResult {
    this.assertIdle();
    const current = this.read();
    this.status = 'preparing';
    try {
      return this.publish({ ...current, revision: this.nextRevision() }, this.weave);
    } finally {
      this.endUpdate();
    }
  }

  /** 读取已发布结果；准备期间仍返回旧结果，提交期间拒绝重入 */
  read(): ReconcilerResult {
    if (this.status === 'committing' || this.status === 'broken' || this.status === 'disposed')
      throw this.contractError(`Cannot read a ${this.status} session`);
    if (this.current === undefined) throw this.contractError('Session is not mounted');
    return this.current;
  }

  /** 读取并清空非致命诊断 */
  diagnostics(): ReadonlyArray<unknown> {
    return this.diagnosticQueue.splice(0);
  }

  /** 释放计算与宿主资源；允许在恢复失败后清理 */
  dispose(): void {
    if (this.targetDisposed) return;
    if (this.status === 'preparing' || this.status === 'committing')
      throw this.contractError('Cannot dispose an active update');
    this.status = 'disposed';
    this.current = undefined;
    this.weave = undefined;
    try {
      this.execution.target?.dispose?.();
      this.targetDisposed = true;
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
    candidate: ReconcilerResult,
    weave: WeaveReconciler | undefined,
    prepared?: WeavePreparedUpdate,
    options = this.options,
  ): ReconcilerResult {
    let target: ReconcilerPreparedCommit | undefined;
    try {
      target = this.execution.target?.prepare(candidate, this.current);
      this.status = 'committing';
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
        this.status = 'broken';
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
          else if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production')
            console.warn(formatCompileWarning(warning));
        } catch (cause) {
          this.diagnosticQueue.push(cause);
        }
      }
    }
    return candidate;
  }

  /** 观测失败不能改变已经发布的编译结果 */
  private reportTrace(outcome: 'full' | 'incremental', visited: number): void {
    try {
      this.execution.trace?.({
        owner: '@retikz/reconciler',
        phase: 'update',
        unit: 'element-compile',
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
    if (this.status !== 'broken' && this.status !== 'disposed') this.status = 'idle';
  }

  private assertIdle(): void {
    if (this.status !== 'idle') throw this.contractError(`Cannot update a ${this.status} session`);
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

/** 执行层非致命诊断 */
export type ReconcilerDiagnostic = Readonly<{
  code: string;
  phase: string;
  severity: 'warning' | 'error';
  message: string;
  owner?: string;
  cause?: unknown;
}>;
/** 批次计算策略 */
export const ReconcilerUpdateStrategy = { Auto: 'auto', Full: 'full' } as const;
/** 批次计算策略取值 */
export type ReconcilerUpdateStrategy = (typeof ReconcilerUpdateStrategy)[keyof typeof ReconcilerUpdateStrategy];
/** 下游消费的完整编译输出 */
export type ReconcilerOutput<
  TComposites extends ReadonlyArray<AnyCompositeDefinition> = ReadonlyArray<AnyCompositeDefinition>,
> = Pick<PreparedSceneCompilation<TComposites>, 'result' | 'diagnostics' | 'observerOutputs'>;
