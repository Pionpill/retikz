import type { AnyCompositeDefinition } from '@retikz/core';
import type { CompileResult, SceneCompilationSnapshot } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { InputPreparedProcessing } from '../_input';

/** Vanilla 编译结果扩展消费的产物与诊断，不要求编译来源信息 */
export type VanillaReconcilerOutput = Pick<SceneCompilationSnapshot<AnyCompositeDefinition>, 'result' | 'diagnostics'>;

/** 创建 Vanilla 编译结果扩展 session 时可读取的领域中立宿主输入 */
export type InputVanillaCompileResultExtension = InputPreparedProcessing &
  Readonly<{
    /** 区分复用同一扩展对象的多个运行实例的稳定 identity */
    instance: object;
  }>;

/** 一次 source/authoring 配置独占的 Vanilla 编译结果扩展 session */
export type VanillaCompileResultExtensionSession = Readonly<{
  /** 在提交前读取本次编译结果，抛错可拒绝候选 */
  resolve: (coreOutput: VanillaReconcilerOutput) => void;
  /** 整帧成功提交后的可选通知 */
  onCommit?: (result: CompileResult) => void;
}>;

/** Vanilla 的领域中立可选编译结果扩展 */
export type VanillaCompileResultExtension = Readonly<{
  /** 根据当前 source、authored sites 与 Core options 创建隔离 session */
  create: (input: InputVanillaCompileResultExtension) => VanillaCompileResultExtensionSession;
}>;

/** 将扩展回调异常归入 Vanilla 错误边界，保留已包装的错误 */
const extensionError = (message: string, cause: unknown): RetikzVanillaError => {
  if (cause instanceof RetikzVanillaError && cause.code === RetikzVanillaErrorCode.CompileResultExtensionFailed)
    return cause;
  return new RetikzVanillaError({
    code: RetikzVanillaErrorCode.CompileResultExtensionFailed,
    message,
    details: {},
    cause,
  });
};

/** 管理扩展会话的候选编译结果与提交后通知 */
export class ResultExtensionHost {
  private static readonly hosts = new WeakMap<VanillaCompileResultExtensionSession, ResultExtensionHost>();
  private readonly prepared = new WeakSet<VanillaReconcilerOutput>();
  private readonly session: VanillaCompileResultExtensionSession;

  private constructor(session: VanillaCompileResultExtensionSession) {
    this.session = session;
  }

  /** 让扩展接收最新输入；返回同一会话时沿用该会话的候选缓存 */
  static open(extension: VanillaCompileResultExtension, input: InputVanillaCompileResultExtension) {
    let session: VanillaCompileResultExtensionSession;
    try {
      session = extension.create(input);
    } catch (cause) {
      throw extensionError('Vanilla compile result extension session creation failed', cause);
    }
    const existing = ResultExtensionHost.hosts.get(session);
    if (existing) return existing;
    const host = new ResultExtensionHost(session);
    ResultExtensionHost.hosts.set(session, host);
    return host;
  }

  /** 同一编译快照只准备一次，失败的候选不缓存 */
  prepare(snapshot: VanillaReconcilerOutput): void {
    if (this.prepared.has(snapshot)) return;
    try {
      this.session.resolve(snapshot);
      this.prepared.add(snapshot);
    } catch (cause) {
      throw extensionError('Vanilla compile result extension resolve failed', cause);
    }
  }

  /** 结果已提交，扩展通知失败不回滚宿主帧 */
  notifyCommit(result: CompileResult): void {
    try {
      this.session.onCommit?.(result);
    } catch (cause) {
      if (__DEV__) console.warn('[retikz] Vanilla compile result extension onCommit failed', cause);
    }
  }
}

/** 缺省扩展：只使用原始编译结果 */
export const defaultVanillaCompileResultExtension: VanillaCompileResultExtension = Object.freeze({
  create: () => ({
    resolve: () => undefined,
  }),
});
