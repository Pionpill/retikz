import { RetikzRetainedRenderError, RetikzRetainedRenderErrorCode } from '@retikz/render/runtime';
import { RuntimeUpdateStrategy } from '@retikz/runtime';

import type { VanillaRetainedRuntimeOptions, VanillaRuntimeOptions } from './types';

import { VanillaViewMode } from './constants';

const invalidRuntimeOptions = (cause: unknown): never => {
  throw new RetikzRetainedRenderError({
    code: RetikzRetainedRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message: 'Vanilla raw-input mount runtime options are invalid',
  });
};

const readDataProperty = (value: object, key: keyof VanillaRetainedRuntimeOptions): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) return undefined;
  if (!Object.hasOwn(descriptor, 'value')) return invalidRuntimeOptions({ key, descriptor });
  return descriptor.value;
};

/** 在宿主创建前复制并校验 raw-input mount 的 Runtime 配置 */
export const captureVanillaRuntimeOptions = (options: object): VanillaRuntimeOptions => {
  try {
    const runtimeDescriptor = Object.getOwnPropertyDescriptor(options, 'runtime');
    if (runtimeDescriptor === undefined) return Object.freeze({ mode: VanillaViewMode.Retained });
    if (!Object.hasOwn(runtimeDescriptor, 'value')) return invalidRuntimeOptions(runtimeDescriptor);
    const runtime: unknown = runtimeDescriptor.value;
    if (runtime === undefined) return Object.freeze({ mode: VanillaViewMode.Retained });
    if (typeof runtime !== 'object' || runtime === null) return invalidRuntimeOptions(runtime);
    const prototype = Object.getPrototypeOf(runtime);
    if (prototype !== Object.prototype && prototype !== null) return invalidRuntimeOptions(runtime);
    const mode = readDataProperty(runtime, 'mode') ?? VanillaViewMode.Retained;
    const updateStrategyDescriptor = Object.getOwnPropertyDescriptor(runtime, 'updateStrategy');
    const rendererFactoryDescriptor = Object.getOwnPropertyDescriptor(runtime, 'rendererFactory');
    const updateStrategy = readDataProperty(runtime, 'updateStrategy');
    const rendererFactory = readDataProperty(runtime, 'rendererFactory');
    if (mode === VanillaViewMode.Static) {
      if (updateStrategyDescriptor !== undefined || rendererFactoryDescriptor !== undefined) {
        return invalidRuntimeOptions(runtime);
      }
      return Object.freeze({ mode });
    }
    if (
      mode !== VanillaViewMode.Retained ||
      (updateStrategy !== undefined &&
        updateStrategy !== RuntimeUpdateStrategy.Auto &&
        updateStrategy !== RuntimeUpdateStrategy.Full) ||
      (rendererFactory !== undefined && typeof rendererFactory !== 'function')
    ) {
      return invalidRuntimeOptions(runtime);
    }
    return Object.freeze({
      mode,
      ...(updateStrategy === undefined ? {} : { updateStrategy }),
      ...(rendererFactory === undefined ? {} : { rendererFactory }),
    }) as VanillaRetainedRuntimeOptions;
  } catch (cause) {
    if (cause instanceof RetikzRetainedRenderError) throw cause;
    return invalidRuntimeOptions(cause);
  }
};
