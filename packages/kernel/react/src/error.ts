import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** React 包稳定错误码 */
export const RetikzReactErrorCode = {
  /** 未被更精确分类覆盖的 React 错误 */
  Default: 'REACT_ERROR',
  /** Kernel React authoring 或 runtime 错误 */
  Kernel: 'REACT_KERNEL_ERROR',
  /** Sugar authoring 错误 */
  Sugar: 'REACT_SUGAR_ERROR',
} as const;

/** React 包稳定错误码取值 */
export type RetikzReactErrorCodeValue = ValueOf<typeof RetikzReactErrorCode>;

/** React 包错误的结构化构造参数 */
export type RetikzReactErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzReactErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzReactErrorCauseOptions = Readonly<Pick<RetikzReactErrorOptions, 'details' | 'cause'>>;

/** React 包未被更精确错误类型覆盖的结构化错误 */
export class RetikzReactError extends RetikzError<RetikzReactErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 React 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 React 错误 */
  constructor(options: RetikzReactErrorOptions);
  /** 使用显式错误码创建 React 错误 */
  constructor(code: RetikzReactErrorCodeValue, message: string, options?: RetikzReactErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzReactErrorOptions | string,
    message?: string,
    causeOptions: RetikzReactErrorCauseOptions = {},
  ) {
    const options: RetikzReactErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzReactErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzReactErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
