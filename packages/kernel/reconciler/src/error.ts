import { RetikzError } from '@retikz/foundation';
import type { ValueOf } from '@retikz/foundation';

/** Reconciler 包稳定错误码 */
export const RetikzReconcilerErrorCode = {
  /** 未分类错误 */
  Default: 'RECONCILER_ERROR',
  /** 增量结果装配失败 */
  Compile: 'RECONCILER_COMPILE_ERROR',
  /** 输入契约无效 */
  Contract: 'RECONCILER_CONTRACT_ERROR',
  /** JSON 捕获失败 */
  Json: 'RECONCILER_JSON_ERROR',
} as const;

/** Reconciler 包稳定错误码取值 */
export type RetikzReconcilerErrorCode = ValueOf<typeof RetikzReconcilerErrorCode>;

/**
 * Reconciler 包错误的结构化构造参数
 * @template TCode 调用方用于错误分支判断的稳定错误码类型
 * @template TDetails 随错误携带的结构化上下文类型
 */
export type RetikzReconcilerErrorOptions<
  TCode extends RetikzReconcilerErrorCode = RetikzReconcilerErrorCode,
  TDetails extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> = Readonly<{
  /** 稳定错误码 */
  code: TCode;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: TDetails;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzReconcilerErrorCauseOptions<TDetails extends Readonly<Record<string, unknown>>> = Readonly<
  Pick<RetikzReconcilerErrorOptions<RetikzReconcilerErrorCode, TDetails>, 'details' | 'cause'>
>;

/**
 * Reconciler 包统一的结构化错误
 * @template TCode 调用方用于错误分支判断的稳定错误码类型
 * @template TDetails 随错误携带的结构化上下文类型
 */
export class RetikzReconcilerError<
  TCode extends RetikzReconcilerErrorCode = RetikzReconcilerErrorCode,
  TDetails extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> extends RetikzError<TCode, TDetails> {
  /** 使用默认错误码创建 Reconciler 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Reconciler 错误 */
  constructor(options: RetikzReconcilerErrorOptions<TCode, TDetails>);
  /** 使用显式错误码创建 Reconciler 错误 */
  constructor(code: TCode, message: string, options?: RetikzReconcilerErrorCauseOptions<TDetails>);
  constructor(
    optionsOrMessageOrCode: RetikzReconcilerErrorOptions<TCode, TDetails> | string,
    message?: string,
    causeOptions: RetikzReconcilerErrorCauseOptions<TDetails> = {},
  ) {
    const options: RetikzReconcilerErrorOptions<TCode, TDetails> =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzReconcilerErrorCode.Default as TCode, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as TCode, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? (Object.freeze({ code: options.code }) as unknown as TDetails),
      cause: options.cause,
    });
  }
}
