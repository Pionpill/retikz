import type { ValueOf } from '@retikz/foundation';
import type { RuntimeDiagnostic, RuntimeUpdateStrategyValue } from '@retikz/runtime';

/** React Layout 的宿主执行模式 */
export const LayoutRuntimeMode = Object.freeze({
  Retained: 'retained',
  Static: 'static',
} as const);

/** React Layout 宿主执行模式取值 */
export type LayoutRuntimeModeValue = ValueOf<typeof LayoutRuntimeMode>;

/** React Layout retained Runtime 配置 */
export type LayoutRetainedRuntimeOptions = Readonly<{
  /**
   * 创建保留式 Runtime Session
   * @default LayoutRuntimeMode.Retained
   */
  mode?: typeof LayoutRuntimeMode.Retained;
  /**
   * Program 更新策略
   * @default RuntimeUpdateStrategy.Auto
   */
  updateStrategy?: RuntimeUpdateStrategyValue;
  /** 按 Vanilla processing controller 的队列顺序接收 Runtime 结构化诊断 */
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
}>;

/** React Layout static Runtime 配置 */
export type LayoutStaticRuntimeOptions = Readonly<{
  /** 不创建 Runtime Session，直接完整编译与物化 */
  mode: typeof LayoutRuntimeMode.Static;
  /** static 不支持 Program 更新策略 */
  updateStrategy?: never;
  /** static 不创建 Runtime session，因此不产生 Runtime 结构化诊断 */
  onDiagnostic?: never;
}>;

/** React Layout 的判别 Runtime 配置 */
export type LayoutRuntimeOptions = LayoutRetainedRuntimeOptions | LayoutStaticRuntimeOptions;

/** 在 render 阶段复制 Runtime 配置，避免后续突变改变本次分派 */
export const captureLayoutRuntimeOptions = (runtime: LayoutRuntimeOptions | undefined): LayoutRuntimeOptions => {
  if (runtime === undefined) return Object.freeze({ mode: LayoutRuntimeMode.Retained });
  if (runtime.mode === LayoutRuntimeMode.Static) return Object.freeze({ mode: runtime.mode });
  return Object.freeze({
    mode: LayoutRuntimeMode.Retained,
    ...(runtime.updateStrategy === undefined ? {} : { updateStrategy: runtime.updateStrategy }),
    ...(runtime.onDiagnostic === undefined ? {} : { onDiagnostic: runtime.onDiagnostic }),
  });
};
