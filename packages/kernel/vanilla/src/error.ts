import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Vanilla 包稳定错误码 */
export const RetikzVanillaErrorCode = {
  /** 未被更精确分类覆盖的 Vanilla 错误 */
  Default: 'VANILLA_ERROR',
  /** Compile driver 执行失败 */
  CompileDriverFailed: 'VANILLA_COMPILE_DRIVER_FAILED',
  /** DOM host 操作失败 */
  Dom: 'VANILLA_DOM_ERROR',
  /** Authoring normalize 失败 */
  Normalize: 'VANILLA_NORMALIZE_ERROR',
  /** Processing controller 失败 */
  Processing: 'VANILLA_PROCESSING_ERROR',
  /** Vanilla runtime 失败 */
  Runtime: 'VANILLA_RUNTIME_ERROR',
} as const;

/** Vanilla 包稳定错误码取值 */
export type RetikzVanillaErrorCodeValue = ValueOf<typeof RetikzVanillaErrorCode>;

/** Vanilla 包错误的结构化构造参数 */
export type RetikzVanillaErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzVanillaErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzVanillaErrorCauseOptions = Readonly<Pick<RetikzVanillaErrorOptions, 'details' | 'cause'>>;

/** Vanilla 包未被更精确错误类型覆盖的结构化错误 */
export class RetikzVanillaError extends RetikzError<RetikzVanillaErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Vanilla 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Vanilla 错误 */
  constructor(options: RetikzVanillaErrorOptions);
  /** 使用显式错误码创建 Vanilla 错误 */
  constructor(code: RetikzVanillaErrorCodeValue, message: string, options?: RetikzVanillaErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzVanillaErrorOptions | string,
    message?: string,
    causeOptions: RetikzVanillaErrorCauseOptions = {},
  ) {
    const options: RetikzVanillaErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzVanillaErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzVanillaErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
