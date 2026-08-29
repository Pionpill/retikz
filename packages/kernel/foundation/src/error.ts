import type { ValueOf } from './types';

/** Retikz 结构化领域错误的基础构造参数 */
export type RetikzErrorOptions<TCode extends string, TDetails extends Readonly<Record<string, unknown>>> = Readonly<{
  /** 结构化错误的分类代码 */
  code: TCode;
  /** 面向调用方的错误消息 */
  message: string;
  /** 与错误代码关联的结构化错误详情 */
  details: TDetails;
  /** 导致当前错误的原始异常或值 */
  cause?: unknown;
}>;

/** Retikz 结构化领域错误的基础骨架 */
export class RetikzError<
  TCode extends string = string,
  TDetails extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> extends Error {
  readonly code: TCode;
  readonly details: TDetails;
  readonly cause?: unknown;

  constructor(options: RetikzErrorOptions<TCode, TDetails>) {
    super(options.message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.details = options.details;
    this.cause = options.cause;
  }
}

/** Foundation 包稳定错误码 */
export const RetikzFoundationErrorCode = {
  /** 未被更精确分类覆盖的 Foundation 错误 */
  Default: 'FOUNDATION_ERROR',
  /** 字符串为空或只包含空白 */
  NonEmptyStringRequired: 'FOUNDATION_NON_EMPTY_STRING_REQUIRED',
  /** 数值不是严格大于零的有限数 */
  PositiveNumberRequired: 'FOUNDATION_POSITIVE_NUMBER_REQUIRED',
  /** JSON 数据无效 */
  Json: 'FOUNDATION_JSON_ERROR',
  /** 静态颜色解析或不透明预合成输入无效 */
  Color: 'FOUNDATION_COLOR_ERROR',
} as const;

/** Foundation 包稳定错误码取值 */
export type RetikzFoundationErrorCodeValue = ValueOf<typeof RetikzFoundationErrorCode>;

/** Foundation 原子契约失败的统一结构化错误 */
export class RetikzFoundationError<
  TCode extends RetikzFoundationErrorCodeValue = RetikzFoundationErrorCodeValue,
  TDetails extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> extends RetikzError<TCode, TDetails> {
  /** 使用默认错误码创建 Foundation 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Foundation 错误 */
  constructor(options: RetikzErrorOptions<TCode, TDetails>);
  constructor(optionsOrMessage: RetikzErrorOptions<TCode, TDetails> | string) {
    super(
      typeof optionsOrMessage === 'string'
        ? {
            code: RetikzFoundationErrorCode.Default as TCode,
            message: optionsOrMessage,
            details: Object.freeze({}) as TDetails,
          }
        : optionsOrMessage,
    );
  }
}

/** 判断动态值是否继承自 Retikz 结构化领域错误 */
export const isRetikzError = (value: unknown): value is RetikzError => value instanceof RetikzError;
