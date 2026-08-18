import type { ValueOf } from '@retikz/foundation';
import type { RuntimeDiagnostic, RuntimeUpdateStrategyValue } from '@retikz/runtime';

import { RuntimeUpdateStrategy } from '@retikz/runtime';

import { RetikzReactError, RetikzReactErrorCode } from '../../error';

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

const invalidRuntimeOptions = (cause: unknown): never => {
  throw new RetikzReactError(RetikzReactErrorCode.Kernel, '[retikz] <Layout>: invalid runtime options', { cause });
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
    const onDiagnosticDescriptor = Object.getOwnPropertyDescriptor(candidate, 'onDiagnostic');
    const updateStrategy = readRuntimeOption(candidate, 'updateStrategy');
    const onDiagnostic = readRuntimeOption(candidate, 'onDiagnostic');
    if (mode === LayoutRuntimeMode.Static) {
      if (updateStrategyDescriptor !== undefined || onDiagnosticDescriptor !== undefined) {
        return invalidRuntimeOptions(runtime);
      }
      return Object.freeze({ mode });
    }
    if (
      mode !== LayoutRuntimeMode.Retained ||
      (updateStrategy !== undefined &&
        updateStrategy !== RuntimeUpdateStrategy.Auto &&
        updateStrategy !== RuntimeUpdateStrategy.Full) ||
      (onDiagnostic !== undefined && typeof onDiagnostic !== 'function')
    ) {
      return invalidRuntimeOptions(runtime);
    }
    return Object.freeze({
      mode,
      ...(updateStrategy === undefined ? {} : { updateStrategy }),
      ...(onDiagnostic === undefined ? {} : { onDiagnostic }),
    }) as LayoutRetainedRuntimeOptions;
  } catch (cause) {
    if (cause instanceof Error && cause.message === '[retikz] <Layout>: invalid runtime options') throw cause;
    return invalidRuntimeOptions(cause);
  }
};
