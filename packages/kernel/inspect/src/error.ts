import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Inspect 包稳定错误码 */
export const RetikzInspectionErrorCode = {
  /** 未被更精确分类覆盖的 Inspect 错误 */
  Default: 'INSPECTION_ERROR',
  /** 编译输出或选择无效 */
  Compile: 'INSPECTION_COMPILE_ERROR',
  /** Inspection 编译失败 */
  CompileFailed: 'INSPECTION_COMPILE_FAILED',
  /** Inspection contract 无效 */
  Contract: 'INSPECTION_CONTRACT_ERROR',
  /** Inspector registry 无效 */
  Registry: 'INSPECTION_REGISTRY_ERROR',
  /** Inspection Vanilla authoring 无效 */
  Vanilla: 'INSPECTION_VANILLA_ERROR',
} as const;

/** Inspect 包稳定错误码取值 */
export type RetikzInspectionErrorCodeValue = ValueOf<typeof RetikzInspectionErrorCode>;

/** Inspect 包错误的结构化构造参数 */
export type RetikzInspectionErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzInspectionErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzInspectionErrorCauseOptions = Readonly<Pick<RetikzInspectionErrorOptions, 'details' | 'cause'>>;

/** Inspect 包未被更精确错误类型覆盖的结构化错误 */
export class RetikzInspectionError extends RetikzError<
  RetikzInspectionErrorCodeValue,
  Readonly<Record<string, unknown>>
> {
  /** 使用默认错误码创建 Inspect 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Inspect 错误 */
  constructor(options: RetikzInspectionErrorOptions);
  /** 使用显式错误码创建 Inspect 错误 */
  constructor(code: RetikzInspectionErrorCodeValue, message: string, options?: RetikzInspectionErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzInspectionErrorOptions | string,
    message?: string,
    causeOptions: RetikzInspectionErrorCauseOptions = {},
  ) {
    const options: RetikzInspectionErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzInspectionErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzInspectionErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
