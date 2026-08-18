import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Render 包稳定错误码 */
export const RetikzRenderErrorCode = {
  /** 未被更精确分类覆盖的 Render 错误 */
  Default: 'RENDER_ERROR',
  /** Canvas 渲染失败 */
  Canvas: 'RENDER_CANVAS_ERROR',
  /** Canvas 节点渲染失败 */
  CanvasNode: 'RENDER_CANVAS_NODE_ERROR',
  /** Render runtime 失败 */
  Runtime: 'RENDER_RUNTIME_ERROR',
  /** SVG 渲染失败 */
  Svg: 'RENDER_SVG_ERROR',
  /** Canvas visibility 初始化失败 */
  CanvasVisibilitySetupFailed: 'CANVAS_VISIBILITY_SETUP_FAILED',
  /** Canvas animation 初始化失败 */
  CanvasAnimationSetupFailed: 'CANVAS_ANIMATION_SETUP_FAILED',
  /** Canvas animation commit 恢复失败 */
  CanvasAnimationCommitRecoveryFailed: 'CANVAS_ANIMATION_COMMIT_RECOVERY_FAILED',
  /** Hydration controller 初始化失败 */
  HydrationControllerSetupFailed: 'HYDRATION_CONTROLLER_SETUP_FAILED',
  /** WAAPI binding 初始化失败 */
  WaapiBindingSetupFailed: 'WAAPI_BINDING_SETUP_FAILED',
} as const;

/** Render 包稳定错误码取值 */
export type RetikzRenderErrorCodeValue = ValueOf<typeof RetikzRenderErrorCode>;

/** Render 包错误的结构化构造参数 */
export type RetikzRenderErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzRenderErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzRenderErrorCauseOptions = Readonly<Pick<RetikzRenderErrorOptions, 'details' | 'cause'>>;

/** Render 包未被更精确错误类型覆盖的结构化错误 */
export class RetikzRenderError extends RetikzError<RetikzRenderErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Render 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Render 错误 */
  constructor(options: RetikzRenderErrorOptions);
  /** 使用显式错误码创建 Render 错误 */
  constructor(code: RetikzRenderErrorCodeValue, message: string, options?: RetikzRenderErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzRenderErrorOptions | string,
    message?: string,
    causeOptions: RetikzRenderErrorCauseOptions = {},
  ) {
    const options: RetikzRenderErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzRenderErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzRenderErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
