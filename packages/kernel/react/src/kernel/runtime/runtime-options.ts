import type { ValueOf } from '@retikz/core';
import type { RetainedRendererFactory } from '@retikz/render/runtime';
import type { RuntimeDiagnostic, RuntimeUpdateStrategyValue } from '@retikz/runtime';

import { RuntimeUpdateStrategy } from '@retikz/runtime';

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
  /** 可选第三方 retained renderer factory；缺省使用内置实现 */
  rendererFactory?: RetainedRendererFactory;
  /** 按 Runtime queue 顺序接收成功提交或失败 transaction 的 diagnostic */
  onDiagnostic?: (diagnostic: RuntimeDiagnostic) => void;
}>;

/** React Layout static Runtime 配置 */
export type LayoutStaticRuntimeOptions = Readonly<{
  /** 不创建 Runtime Session，直接完整编译与物化 */
  mode: typeof LayoutRuntimeMode.Static;
  /** static 不支持 Program 更新策略 */
  updateStrategy?: never;
  /** static 不支持 retained renderer factory */
  rendererFactory?: never;
  /** static 不产生 Runtime diagnostic */
  onDiagnostic?: never;
}>;

/** React Layout 的判别 Runtime 配置 */
export type LayoutRuntimeOptions = LayoutRetainedRuntimeOptions | LayoutStaticRuntimeOptions;

const invalidRuntimeOptions = (cause: unknown): never => {
  const error = new Error('[retikz] <Layout>: invalid runtime options');
  Object.defineProperty(error, 'cause', { value: cause, enumerable: false });
  throw error;
};

const readRuntimeOption = (runtime: object, key: keyof LayoutRetainedRuntimeOptions): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(runtime, key);
  if (descriptor === undefined) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) return invalidRuntimeOptions({ key, descriptor });
  return descriptor.value;
};

/** 在 render 阶段复制并校验 Runtime 配置，避免 accessor 或后续突变改变本次分派 */
export const captureLayoutRuntimeOptions = (runtime: LayoutRuntimeOptions | undefined): LayoutRuntimeOptions => {
  if (runtime === undefined) return Object.freeze({ mode: LayoutRuntimeMode.Retained });
  const candidate: unknown = runtime;
  try {
    if (typeof candidate !== 'object' || candidate === null) return invalidRuntimeOptions(runtime);
    const prototype = Object.getPrototypeOf(candidate);
    if (prototype !== Object.prototype && prototype !== null) return invalidRuntimeOptions(runtime);
    const mode = readRuntimeOption(candidate, 'mode') ?? LayoutRuntimeMode.Retained;
    const updateStrategyDescriptor = Object.getOwnPropertyDescriptor(candidate, 'updateStrategy');
    const rendererFactoryDescriptor = Object.getOwnPropertyDescriptor(candidate, 'rendererFactory');
    const onDiagnosticDescriptor = Object.getOwnPropertyDescriptor(candidate, 'onDiagnostic');
    const updateStrategy = readRuntimeOption(candidate, 'updateStrategy');
    const rendererFactory = readRuntimeOption(candidate, 'rendererFactory');
    const onDiagnostic = readRuntimeOption(candidate, 'onDiagnostic');
    if (mode === LayoutRuntimeMode.Static) {
      if (
        updateStrategyDescriptor !== undefined ||
        rendererFactoryDescriptor !== undefined ||
        onDiagnosticDescriptor !== undefined
      ) {
        return invalidRuntimeOptions(runtime);
      }
      return Object.freeze({ mode });
    }
    if (
      mode !== LayoutRuntimeMode.Retained ||
      (updateStrategy !== undefined &&
        updateStrategy !== RuntimeUpdateStrategy.Auto &&
        updateStrategy !== RuntimeUpdateStrategy.Full) ||
      (rendererFactory !== undefined && typeof rendererFactory !== 'function') ||
      (onDiagnostic !== undefined && typeof onDiagnostic !== 'function')
    ) {
      return invalidRuntimeOptions(runtime);
    }
    return Object.freeze({
      mode,
      ...(updateStrategy === undefined ? {} : { updateStrategy }),
      ...(rendererFactory === undefined ? {} : { rendererFactory }),
      ...(onDiagnostic === undefined ? {} : { onDiagnostic }),
    }) as LayoutRetainedRuntimeOptions;
  } catch (cause) {
    if (cause instanceof Error && cause.message === '[retikz] <Layout>: invalid runtime options') throw cause;
    return invalidRuntimeOptions(cause);
  }
};
