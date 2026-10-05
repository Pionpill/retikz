import type { ValueOf } from '@retikz/foundation';
import type { RuntimeDiagnostic, RuntimeUpdateStrategy } from '@retikz/runtime';

/** React Layout 的宿主执行模式 */
export const LayoutRuntimeMode = Object.freeze({
  Retained: 'retained',
  Static: 'static',
} as const);

/** React Layout 宿主执行模式取值 */
export type LayoutRuntimeMode = ValueOf<typeof LayoutRuntimeMode>;

/** 作者贡献准备方式，独立于 Runtime 的更新策略 */
type LayoutPreparationOptions = Readonly<{
  /** 客户端作者准备方式；同步 SSR 仍消费同步 lower
   * @default 'sync'
   */
  preparation?: 'sync' | 'async';
  /** 异步 preparation 与 controller 的生命周期信号 */
  signal?: AbortSignal;
}>;

/** 保留执行状态以处理后续图形更新；省略 runtime 或 mode 时使用此模式 */
export type LayoutRetainedRuntimeOptions = LayoutPreparationOptions &
  Readonly<{
    /**
     * 创建保留式 Runtime
     * @default LayoutRuntimeMode.Retained
     */
    mode?: typeof LayoutRuntimeMode.Retained;
    /**
     * 更新策略；auto 按变更和执行器能力选择增量或完整执行，full 强制完整执行
     * @default RuntimeUpdateStrategy.Auto
     */
    updateStrategy?: RuntimeUpdateStrategy;
    /** 接收图形更新的结构化诊断，按产生顺序通知；更新失败时保留最后一次成功画面 */
    onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
  }>;

/** 每次输入变化时完整编译图形，不保留增量执行状态 */
export type LayoutStaticRuntimeOptions = LayoutPreparationOptions &
  Readonly<{
    /** 不创建 Runtime，直接完整编译与物化 */
    mode: typeof LayoutRuntimeMode.Static;
    /** static 不支持 Computation 更新策略 */
    updateStrategy?: never;
    /** static 不创建 Runtime，因此不产生 Runtime 结构化诊断 */
    onDiagnostic?: never;
  }>;

/** 通过 mode 选择图形更新方式；retained 支持更新策略和诊断回调，static 不接受这两个选项 */
export type LayoutRuntimeOptions = LayoutRetainedRuntimeOptions | LayoutStaticRuntimeOptions;

/** 在 render 阶段复制 Runtime 配置，避免后续突变改变本次分派 */
export const captureLayoutRuntimeOptions = (runtime: LayoutRuntimeOptions | undefined): LayoutRuntimeOptions => {
  if (runtime === undefined) return Object.freeze({ mode: LayoutRuntimeMode.Retained });
  if (runtime.mode === LayoutRuntimeMode.Static)
    return Object.freeze({ mode: runtime.mode, preparation: runtime.preparation, signal: runtime.signal });

  return Object.freeze({
    mode: LayoutRuntimeMode.Retained,
    preparation: runtime.preparation,
    signal: runtime.signal,
    ...(runtime.updateStrategy === undefined ? {} : { updateStrategy: runtime.updateStrategy }),
    ...(runtime.onDiagnostic === undefined ? {} : { onDiagnostic: runtime.onDiagnostic }),
  });
};
