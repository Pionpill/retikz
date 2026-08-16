import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart 解析的稳定错误码 */
export const ChartResolveErrorCode = {
  UnknownType: 'unknown-type',
  InvalidChartIR: 'invalid-chart-ir',
  InvalidResolvedPlot: 'invalid-resolved-plot',
} as const;

/** Chart 解析错误码取值 */
export type ChartResolveErrorCodeValue = ValueOf<typeof ChartResolveErrorCode>;

type ChartResolveErrorOptions = {
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
  /** 原始数据结构或提供器错误 */
  cause?: unknown;
};

type ChartResolveErrorDetails = Readonly<{
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
}>;

/** Chart 解析器对外提供的结构化内部错误 */
export class ChartResolveError extends RetikzError<ChartResolveErrorCodeValue, ChartResolveErrorDetails> {
  /** 稳定错误码 */
  readonly code: ChartResolveErrorCodeValue;
  /** 用户可修正的结构化输入路径 */
  readonly path: ReadonlyArray<string | number>;
  /** 原始数据结构或提供器错误 */
  override readonly cause?: unknown;

  /** 建立结构化 Chart 解析错误 */
  constructor(code: ChartResolveErrorCodeValue, options: ChartResolveErrorOptions) {
    const details: ChartResolveErrorDetails = {
      path: options.path,
    };
    super({ code, message: `Chart resolution failed: ${code}`, details, cause: options.cause });
    this.name = 'ChartResolveError';
    this.code = code;
    this.path = options.path;
    this.cause = options.cause;
  }
}
