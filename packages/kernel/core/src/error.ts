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
export type RetikzCoreErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzCoreErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzCoreErrorCauseOptions = Readonly<Pick<RetikzCoreErrorOptions, 'details' | 'cause'>>;

/** Core 包未被更精确错误类型覆盖的结构化错误 */
export class RetikzCoreError extends RetikzError<RetikzCoreErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Core 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Core 错误 */
  constructor(options: RetikzCoreErrorOptions);
  /** 使用显式错误码创建 Core 错误 */
  constructor(code: RetikzCoreErrorCodeValue, message: string, options?: RetikzCoreErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzCoreErrorOptions | string,
    message?: string,
    causeOptions: RetikzCoreErrorCauseOptions = {},
  ) {
    const options: RetikzCoreErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzCoreErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzCoreErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
