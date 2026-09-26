import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Inspect 包稳定错误码 */
export const RetikzInspectErrorCode = {
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
export type RetikzInspectErrorCodeValue = ValueOf<typeof RetikzInspectErrorCode>;

/** Inspect 包错误的结构化构造参数 */
export type RetikzInspectErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzInspectErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzInspectErrorCauseOptions = Readonly<Pick<RetikzInspectErrorOptions, 'details' | 'cause'>>;

/** Inspect 包统一的结构化错误 */
export class RetikzInspectError extends RetikzError<RetikzInspectErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Inspect 错误
   *
   * @param message 面向调用方的错误消息，错误码为 INSPECTION_ERROR
   */
  constructor(message: string);
  /** 使用结构化参数创建 Inspect 错误
   *
   * @param options 错误码、消息与可选详情、原始原因；省略 details 时使用包含 code 的只读对象
   */
  constructor(options: RetikzInspectErrorOptions);
  /** 使用显式错误码创建 Inspect 错误
   *
   * @param code 用于调用方分支处理的稳定错误码
   * @param message 面向调用方的错误消息
   * @param options 可选详情与原始原因；省略 details 时使用包含 code 的只读对象
   */
  constructor(code: RetikzInspectErrorCodeValue, message: string, options?: RetikzInspectErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzInspectErrorOptions | string,
    message?: string,
    causeOptions: RetikzInspectErrorCauseOptions = {},
  ) {
    const options: RetikzInspectErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzInspectErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzInspectErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
