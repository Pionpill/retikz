import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Core 包稳定错误码 */
export const RetikzCoreErrorCode = {
  /** 未被更精确分类覆盖的 Core 错误 */
  Default: 'CORE_ERROR',
  /** 颜色处理失败 */
  Color: 'CORE_COLOR_ERROR',
  /** 编译阶段失败 */
  Compile: 'CORE_COMPILE_ERROR',
  /** 编译内部不变量被破坏 */
  CompileInvariantViolation: 'CORE_COMPILE_INVARIANT_VIOLATION',
  /** Composite contract 被破坏 */
  CompositeContractViolation: 'CORE_COMPOSITE_CONTRACT_VIOLATION',
  /** 公共 contract 无效 */
  Contract: 'CORE_CONTRACT_ERROR',
  /** 几何计算失败 */
  Geometry: 'CORE_GEOMETRY_ERROR',
  /** JSON 数据无效 */
  Json: 'CORE_JSON_ERROR',
  /** Layout probe 可恢复失败 */
  LayoutProbeRecoverable: 'CORE_LAYOUT_PROBE_RECOVERABLE',
  /** 解析输入失败 */
  Parse: 'CORE_PARSE_ERROR',
  /** Provider 注册或解析失败 */
  Provider: 'CORE_PROVIDER_ERROR',
  /** 领域解析失败 */
  Resolve: 'CORE_RESOLVE_ERROR',
  /** Schema 构造或校验失败 */
  Schema: 'CORE_SCHEMA_ERROR',
} as const;

/** Core 包稳定错误码取值 */
export type RetikzCoreErrorCodeValue = ValueOf<typeof RetikzCoreErrorCode>;

/** Core 包错误的结构化构造参数 */
export type RetikzCoreErrorOptions<
  TCode extends RetikzCoreErrorCodeValue = RetikzCoreErrorCodeValue,
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

type RetikzCoreErrorCauseOptions<TDetails extends Readonly<Record<string, unknown>>> = Readonly<
  Pick<RetikzCoreErrorOptions<RetikzCoreErrorCodeValue, TDetails>, 'details' | 'cause'>
>;

/** Core 包统一的结构化错误 */
export class RetikzCoreError<
  TCode extends RetikzCoreErrorCodeValue = RetikzCoreErrorCodeValue,
  TDetails extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> extends RetikzError<TCode, TDetails> {
  /** 使用默认错误码创建 Core 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Core 错误 */
  constructor(options: RetikzCoreErrorOptions<TCode, TDetails>);
  /** 使用显式错误码创建 Core 错误 */
  constructor(code: TCode, message: string, options?: RetikzCoreErrorCauseOptions<TDetails>);
  constructor(
    optionsOrMessageOrCode: RetikzCoreErrorOptions<TCode, TDetails> | string,
    message?: string,
    causeOptions: RetikzCoreErrorCauseOptions<TDetails> = {},
  ) {
    const options: RetikzCoreErrorOptions<TCode, TDetails> =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzCoreErrorCode.Default as TCode, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as TCode, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? (Object.freeze({ code: options.code }) as unknown as TDetails),
      cause: options.cause,
    });
  }
}
