import type { IRScene } from '@retikz/core';
import type { ReconcilerCommitTarget, ReconcilerResult, WeaveBatch } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { InputScene } from '../../normalize';
import { prepareProcessingInput } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions } from '../_input';
import { renderToSvg } from '../output';
import type { RenderToStringOptions } from '../output';

/** 组合单场景编译和宿主提交；仅在底层事务成功后发布协调器原始快照 */
export class SceneRuntime {
  private readonly listeners = new Set<(result: ReconcilerResult) => void>();
  private readonly failures: Array<unknown> = [];
  private readonly reconciler: SceneReconciler;
  /** 构造时随首次成功 mount 发布，之后只在底层提交成功后替换 */
  private current!: ReconcilerResult;
  private disposed = false;
  private writing = false;

  protected constructor(
    initial: InputPreparedProcessing,
    private readonly options: ProcessingOptions,
    createTarget?: () => ReconcilerCommitTarget,
    private readonly assertOwnerActive?: () => void,
  ) {
    this.assertActive();
    const target = createTarget?.();
    this.reconciler = new SceneReconciler(initial.coreOptions, {
      ...options.reconciler,
      captureProvenance: target !== undefined || options.reconciler?.captureProvenance,
      target: this.createCommitTarget(target),
    });
    try {
      this.publish(this.reconciler.mount(initial.source));
    } catch (cause) {
      this.reconciler.dispose();
      throw cause;
    }
  }

  /** 从单图作者声明及其嵌入贡献建立会话 */
  static fromInput(input: InputScene, options: ProcessingOptions = {}) {
    return new SceneRuntime(prepareProcessingInput(input, options.compile), options);
  }

  /** 从已类型化的 Core IR 建立会话 */
  static fromIR(ir: IRScene, options: ProcessingOptions = {}) {
    return new SceneRuntime(prepareProcessingInput(ir, options.compile), options);
  }

  /** 导出最后一次成功提交的场景，不重新编译或发送通知 */
  renderToSvg(options?: RenderToStringOptions) {
    return renderToSvg(this.current.compilation.result.scene, options);
  }

  /** 读取最后一次成功提交的结果 */
  readonly read = (): ReconcilerResult => this.current;

  /** 订阅后续成功提交 */
  readonly subscribe = (listener: (result: ReconcilerResult) => void) => {
    this.assertActive();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** 原子替换完整作者输入或 IR */
  readonly replace = (source: InputScene | IRScene) =>
    this.write(() => this.commitReplacement(prepareProcessingInput(source, this.options.compile)));

  protected replacePrepared(next: InputPreparedProcessing) {
    this.write(() => this.commitReplacement(next));
  }

  /** 在输入准备、底层提交和通知期间保持单一写者；销毁立即生效，释放等到底层事务退出 */
  private write(action: () => void) {
    this.assertActive();
    if (this.writing)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot reenter a processing update');
    this.writing = true;
    try {
      action();
    } catch (cause) {
      this.failures.push(cause);
      throw cause;
    } finally {
      this.writing = false;
      if (this.disposed) this.reconciler.dispose();
    }
  }

  private commitReplacement(next: InputPreparedProcessing) {
    this.assertActive();
    this.publish(this.reconciler.replace(next.source, next.coreOptions));
  }

  /** 读取指定版本的 scope 地址 */
  getScopeId(path: ReadonlyArray<number>, expected: ReconcilerResult) {
    this.assertActive();
    return this.reconciler.getScopeId(path, expected);
  }

  /** 将变更批次应用到指定的已提交版本 */
  update(batch: WeaveBatch, expected: ReconcilerResult) {
    this.write(() => {
      const committed = this.reconciler.update(batch, expected);
      if (committed !== expected) this.publish(committed);
    });
  }

  protected refreshTarget() {
    this.write(() => this.publish(this.reconciler.updateTarget()));
  }

  /** 读取并清空本会话的诊断 */
  readonly diagnostics = (): ReadonlyArray<unknown> => {
    const diagnostics = this.reconciler.diagnostics();
    if (this.failures.length === 0) return diagnostics;
    const failures = this.failures.splice(0);
    for (const diagnostic of diagnostics) failures.push(diagnostic);
    return failures;
  };

  /** 释放会话并禁止后续写入 */
  readonly dispose = () => {
    this.disposed = true;
    this.listeners.clear();
    if (!this.writing) this.reconciler.dispose();
  };

  /** 销毁可中断提交；宿主实际修改及恢复仍由原目标执行 */
  private createCommitTarget(target?: ReconcilerCommitTarget): ReconcilerCommitTarget {
    return {
      prepare: (candidate, previous) => {
        this.assertActive();
        const token = target?.prepare(candidate, previous);
        return {
          commit: () => {
            this.assertActive();
            token?.commit();
            this.assertActive();
          },
          rollback: () => token?.rollback(),
          dispose: () => token?.dispose(),
        };
      },
      dispose: () => target?.dispose?.(),
    };
  }

  private publish(committed: ReconcilerResult) {
    this.current = committed;
    for (const listener of this.listeners) {
      try {
        listener(committed);
      } catch (cause) {
        this.failures.push(cause);
      }
    }
  }

  private assertActive() {
    this.assertOwnerActive?.();
    if (this.disposed)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing controller is disposed');
  }
}

/** 包内宿主接线：DOM 提交目标与层栈会话，不从包入口导出 */
export class HostedSceneRuntime extends SceneRuntime {
  /** 从作者输入建立同步会话 */
  static fromSource(
    source: InputScene | IRScene,
    options: ProcessingOptions,
    createTarget?: () => ReconcilerCommitTarget,
  ) {
    return new HostedSceneRuntime(prepareProcessingInput(source, options.compile), options, createTarget);
  }

  /** 复用已完成的准备；不重新遍历作者输入 */
  static fromPrepared(initial: InputPreparedProcessing, options: ProcessingOptions, assertOwnerActive: () => void) {
    return new HostedSceneRuntime(initial, options, undefined, assertOwnerActive);
  }

  updatePrepared(next: InputPreparedProcessing) {
    this.replacePrepared(next);
  }

  updateTarget() {
    this.refreshTarget();
  }
}
