import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** TeX 包稳定错误码 */
export const RetikzTexErrorCode = {
  /** 未被更精确分类覆盖的 TeX 错误 */
  Default: 'TEX_ERROR',
  /** MathJax 处理失败 */
  MathJax: 'TEX_MATHJAX_ERROR',
  /** SVG 输入合法但当前 lowering 能力不支持 */
  SvgUnsupported: 'TEX_SVG_UNSUPPORTED',
  /** SVG 输入格式无效 */
  SvgMalformed: 'TEX_SVG_MALFORMED',
} as const;

/** TeX 包稳定错误码取值 */
export type RetikzTexErrorCodeValue = ValueOf<typeof RetikzTexErrorCode>;

/** TeX 包错误的结构化构造参数 */
export type RetikzTexErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzTexErrorCodeValue;
  /** 面向调用方的原始错误消息 */
  message: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzTexErrorCauseOptions = Readonly<Pick<RetikzTexErrorOptions, 'details' | 'cause'>>;

/** TeX 包统一的结构化错误 */
export class RetikzTexError extends RetikzError<RetikzTexErrorCodeValue, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 TeX 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 TeX 错误 */
  constructor(options: RetikzTexErrorOptions);
  /** 使用显式错误码创建 TeX 错误 */
  constructor(code: RetikzTexErrorCodeValue, message: string, options?: RetikzTexErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzTexErrorOptions | string,
    message?: string,
    causeOptions: RetikzTexErrorCauseOptions = {},
  ) {
    const options: RetikzTexErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzTexErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzTexErrorCodeValue, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}
