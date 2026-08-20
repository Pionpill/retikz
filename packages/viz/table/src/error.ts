import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Table 包稳定错误码 */
export const RetikzTableErrorCode = {
  /** 未被更精确分类覆盖的 Table 错误 */
  Default: 'TABLE_ERROR',
  /** Table transaction 阶段失败 */
  TransactionStageFailed: 'TABLE_TRANSACTION_STAGE_FAILED',
} as const;

/** Table 包稳定错误码取值 */
export type RetikzTableErrorCodeValue = ValueOf<typeof RetikzTableErrorCode>;

/** Table 包运行时错误的可选构造参数 */
export type RetikzTableErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzTableErrorCodeValue;
  /** 面向调用方的错误消息 */
  message?: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

type RetikzTableErrorCauseOptions = Readonly<Pick<RetikzTableErrorOptions, 'cause'>>;

/** Table 包统一的结构化错误 */
export class RetikzTableError extends RetikzError<RetikzTableErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Table 错误 */
  constructor(message: string, options?: RetikzTableErrorCauseOptions);
  /** 使用结构化参数创建 Table 错误 */
  constructor(options: RetikzTableErrorOptions);
  constructor(optionsOrMessage: RetikzTableErrorOptions | string, causeOptions: RetikzTableErrorCauseOptions = {}) {
    const options: RetikzTableErrorOptions =
      typeof optionsOrMessage === 'string'
        ? {
            code: RetikzTableErrorCode.Default,
            message: optionsOrMessage,
            details: { message: optionsOrMessage },
            ...causeOptions,
          }
        : optionsOrMessage;
    super({
      code: options.code,
      message: options.message ?? options.code,
      details: options.details ?? Object.freeze({}),
      cause: options.cause,
    });
  }
}
