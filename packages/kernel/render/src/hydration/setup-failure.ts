import type { HydrationController } from './controller';

import { RetikzRenderError, RetikzRenderErrorCode } from '../error';

const hydrationSetupFailures = new WeakMap<
  RetikzRenderError,
  Readonly<{ cause: unknown; controller: HydrationController }>
>();

/** 创建 Hydration controller 注册与初次清理双重失败 */
export const createHydrationSetupError = (
  cause: unknown,
  cleanupCause: unknown,
  controller: HydrationController,
): RetikzRenderError => {
  const error = new RetikzRenderError({
    code: RetikzRenderErrorCode.HydrationControllerSetupFailed,
    message: 'Hydration controller setup and cleanup failed',
    details: { cleanupCause, controller },
    cause,
  });
  hydrationSetupFailures.set(error, Object.freeze({ cause, controller }));
  return error;
};

/** 读取 owner 必须重试清理的 Hydration controller 与 primary cause */
export const recoverHydrationSetupFailure = (
  cause: unknown,
): Readonly<{ cause: unknown; controller: HydrationController }> | undefined => {
  if (!(cause instanceof RetikzRenderError)) return undefined;
  return hydrationSetupFailures.get(cause);
};
