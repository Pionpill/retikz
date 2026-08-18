import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart 解析的稳定错误码 */
export const RetikzChartResolveErrorCode = {
  UnknownType: 'unknown-type',
  InvalidChartIR: 'invalid-chart-ir',
  InvalidResolvedPlot: 'invalid-resolved-plot',
} as const;

/** Chart 解析错误码取值 */
export type RetikzChartResolveErrorCodeValue = ValueOf<typeof RetikzChartResolveErrorCode>;

type RetikzChartResolveErrorOptions = {
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
  /** 原始数据结构或提供器错误 */
  cause?: unknown;
};

type RetikzChartResolveErrorDetails = Readonly<{
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
}>;

/** Chart 解析器对外提供的结构化内部错误 */
export class RetikzChartResolveError extends RetikzError<
  RetikzChartResolveErrorCodeValue,
  RetikzChartResolveErrorDetails
> {
  /** 稳定错误码 */
  readonly code: RetikzChartResolveErrorCodeValue;
  /** 用户可修正的结构化输入路径 */
  readonly path: ReadonlyArray<string | number>;
  /** 原始数据结构或提供器错误 */
  override readonly cause?: unknown;

  /** 建立结构化 Chart 解析错误 */
  constructor(code: RetikzChartResolveErrorCodeValue, options: RetikzChartResolveErrorOptions) {
    const details: RetikzChartResolveErrorDetails = {
      path: options.path,
    };
    super({ code, message: `Chart resolution failed: ${code}`, details, cause: options.cause });
    this.name = 'RetikzChartResolveError';
    this.code = code;
    this.path = options.path;
    this.cause = options.cause;
  }
}
