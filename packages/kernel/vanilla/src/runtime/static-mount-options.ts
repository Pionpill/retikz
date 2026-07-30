import { RetainedRenderError, RetainedRenderErrorCode } from '@retikz/render/runtime';

/** 拒绝预编译 Scene static mount 中会被静默忽略的 retained Runtime 字段 */
export const assertStaticMountRuntimeExcluded = (options: unknown): void => {
  if (typeof options !== 'object' || options === null || !Reflect.has(options, 'runtime')) return;
  throw new RetainedRenderError({
    code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
    cause: options,
    message: 'Vanilla static mount options must not include retained Runtime config',
  });
};
