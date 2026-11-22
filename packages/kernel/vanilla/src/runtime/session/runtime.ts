import type { AnyCompositeDefinition } from '@retikz/core';
import type { WeaveBatch } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import { prepareProcessingInput } from '../_input';
import type { InputPreparedProcessing, ProcessingOptions, SingleSceneSource } from '../_input';
import type { InputVanillaCompileResultExtension, VanillaCompileResultExtension, ProcessingResult } from '../compile';
import { ResultExtensionHost, defaultVanillaCompileResultExtension } from '../compile';
import type { ProcessingTransactionParticipant, ProcessingTransactionParticipantFactory } from './participant';

/** 一个底层编译会话及与它同生共灭的宿主目标 */
type MountedSession = {
  reconciler: SceneReconciler<AnyCompositeDefinition>;
  participant?: ProcessingTransactionParticipant;
};

/** 同一拓扑允许替换回调；键或 schema 改变时需要新建宿主会话 */
const compatibleDefinitions = (
  previous: InputPreparedProcessing['coreOptions']['composites'] = [],
  next: InputPreparedProcessing['coreOptions']['composites'] = [],
) =>
  previous.length === next.length &&
  previous.every((a, index) => {
    const b = next[index];
    return (
      a.namespace === b.namespace && a.type === b.type && a.schema === b.schema && a.artifactSchema === b.artifactSchema
    );
  });

/** 组合单场景编译和宿主提交；仅在底层事务成功后发布新的 Vanilla 结果 */
export class SceneRuntime {
  private readonly instance = {};
  private readonly listeners = new Set<(result: ProcessingResult) => void>();
  private readonly failures: Array<unknown> = [];
  private readonly extension: VanillaCompileResultExtension;
  private extensionSession: ResultExtensionHost;
  private input: InputVanillaCompileResultExtension;
  private mounted: MountedSession;
  private current: ProcessingResult;
  private disposed = false;
  private writing = false;
  private check?: () => void;

  private constructor(
    initial: InputPreparedProcessing,
    private readonly options: ProcessingOptions,
    private readonly participantFactory?: ProcessingTransactionParticipantFactory,
    check?: () => void,
    notifications?: Array<() => void>,
  ) {
    this.check = check;
    this.extension = options.compileResultExtension ?? defaultVanillaCompileResultExtension;
    this.input = this.extensionInput(initial);
    this.extensionSession = ResultExtensionHost.open(this.extension, this.input);
    this.check?.();
    this.mounted = this.mount(initial);
    const output = this.output();
    this.current = Object.freeze({
      revision: 0,
      compileResult: output.primary,
      processingDiagnostics: output.processingDiagnostics,
    });
    const notify = () => this.extensionSession.notifyCommit(output);
    if (notifications) notifications.push(notify);
    else notify();
    this.check = undefined;
  }

  /** 从作者输入建立同步会话 */
  static fromSource(
    source: SingleSceneSource,
    options: ProcessingOptions,
    factory?: ProcessingTransactionParticipantFactory,
  ) {
    return new SceneRuntime(prepareProcessingInput(source, options), options, factory);
  }

  /** 复用已完成的准备；不重新遍历作者输入 */
  static fromPrepared(
    initial: InputPreparedProcessing,
    options: ProcessingOptions,
    check?: () => void,
    notifications?: Array<() => void>,
  ) {
    return new SceneRuntime(initial, options, undefined, check, notifications);
  }

  readonly read = (): ProcessingResult => this.current;

  readonly subscribe = (listener: (result: ProcessingResult) => void) => {
    this.assertActive();
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly update = (source: SingleSceneSource) =>
    this.write(() => this.replace(prepareProcessingInput(source, this.options)));

  updatePrepared(next: InputPreparedProcessing, check?: () => void, notifications?: Array<() => void>) {
    this.write(() => this.replace(next, notifications), check);
  }

  /** 在输入准备、底层提交和通知期间保持单一写者；取消立即生效，释放等到底层事务退出 */
  private write(action: () => void, check?: () => void) {
    this.assertActive();
    if (this.writing)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Cannot reenter a processing update');
    if (check) this.failures.push(...this.mounted.reconciler.diagnostics());
    this.writing = true;
    this.check = () => {
      this.assertActive();
      check?.();
    };
    try {
      this.check();
      action();
    } catch (cause) {
      try {
        check?.();
      } catch {
        this.mounted.reconciler.diagnostics();
        throw cause;
      }
      this.failures.push(cause);
      throw cause;
    } finally {
      this.check = undefined;
      this.writing = false;
      if (this.disposed) this.mounted.reconciler.dispose();
    }
  }

  private replace(next: InputPreparedProcessing, notifications?: Array<() => void>) {
    const nextInput = this.extensionInput(next);
    try {
      this.extensionSession = ResultExtensionHost.open(this.extension, nextInput);
      this.check?.();
      if (compatibleDefinitions(this.input.coreOptions.composites, next.coreOptions.composites)) {
        this.mounted.participant?.update();
        this.mounted.reconciler.replace(next.source, next.coreOptions);
      } else {
        const previous = this.mounted;
        this.mounted = this.mount(next);
        previous.reconciler.dispose();
      }
    } catch (cause) {
      try {
        this.extensionSession = ResultExtensionHost.open(this.extension, this.input);
      } catch (recoveryError) {
        throw new RetikzVanillaError({
          code: RetikzVanillaErrorCode.Processing,
          message: 'Failed to restore compile result extension',
          cause,
          details: { recoveryError },
        });
      }
      throw cause;
    }
    this.input = nextInput;
    this.publish(notifications);
  }

  getScopeId(path: ReadonlyArray<number>, expected: ProcessingResult) {
    this.assertExpected(expected);
    return this.mounted.reconciler.getScopeId(path);
  }

  applyBatch(batch: WeaveBatch, expected: ProcessingResult, notifications?: Array<() => void>) {
    this.write(() => {
      this.assertExpected(expected);
      const { reconciler } = this.mounted;
      const previous = reconciler.read();
      if (reconciler.update(batch, previous) !== previous) this.publish(notifications);
    });
  }

  updateParticipant() {
    this.write(() => {
      const { participant, reconciler } = this.mounted;
      if (!participant)
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Renderer configuration is unavailable');
      participant.update();
      reconciler.updateTarget();
      this.publish();
    });
  }

  readonly diagnostics = (): ReadonlyArray<unknown> => {
    const diagnostics = this.mounted.reconciler.diagnostics();
    if (this.failures.length === 0) return diagnostics;
    const failures = this.failures.splice(0);
    for (const diagnostic of diagnostics) failures.push(diagnostic);
    return failures;
  };

  readonly dispose = () => {
    this.disposed = true;
    this.listeners.clear();
    if (!this.writing) this.mounted.reconciler.dispose();
  };

  private extensionInput(prepared: InputPreparedProcessing): InputVanillaCompileResultExtension {
    return { ...prepared, instance: this.instance };
  }

  private mount(initial: InputPreparedProcessing): MountedSession {
    const participant = this.participantFactory?.();
    const execution = this.options.reconciler;
    const reconciler = new SceneReconciler(initial.coreOptions, {
      ...execution,
      captureProvenance: participant !== undefined || execution?.captureProvenance,
      target: {
        prepare: (candidate, previous) => {
          // 扩展解析可能失败，须在宿主提交之前执行；发布时复用同一快照的解析结果
          this.extensionSession.prepare(candidate.compilation);
          this.check?.();
          const token = participant?.target.prepare(candidate, previous);
          return {
            commit: () => {
              this.check?.();
              token?.commit();
              this.check?.();
            },
            rollback: () => token?.rollback(),
            dispose: () => token?.dispose(),
          };
        },
        dispose: () => participant?.target.dispose?.(),
      },
    });
    try {
      reconciler.mount(initial.source);
      participant?.connect?.();
      return { reconciler, participant };
    } catch (cause) {
      reconciler.dispose();
      throw cause;
    }
  }

  private output() {
    return this.extensionSession.prepare(this.mounted.reconciler.read().compilation);
  }

  private publish(notifications?: Array<() => void>) {
    const output = this.output();
    const result = Object.freeze({
      revision: this.current.revision + 1,
      compileResult: output.primary,
      processingDiagnostics: output.processingDiagnostics,
    });
    this.current = result;
    const notify = () => this.extensionSession.notifyCommit(output);
    if (notifications) notifications.push(notify);
    else notify();
    for (const listener of this.listeners) {
      try {
        listener(result);
      } catch (cause) {
        this.failures.push(cause);
      }
    }
  }

  private assertActive() {
    if (this.disposed)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing controller is disposed');
  }

  private assertExpected(expected: ProcessingResult) {
    this.assertActive();
    if (this.current !== expected)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Stale layer result');
  }
}
