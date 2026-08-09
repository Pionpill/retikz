import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Chart resolution 的稳定错误码 */
export const ChartResolveErrorCode = {
  UnknownType: 'unknown-type',
  InvalidChartSpec: 'invalid-chart-spec',
  InvalidPatch: 'invalid-patch',
  UnknownTarget: 'unknown-target',
  DuplicateTarget: 'duplicate-target',
  ProtectedField: 'protected-field',
  ReservedId: 'reserved-id',
  DuplicateId: 'duplicate-id',
  DuplicateScale: 'duplicate-scale',
  CoordinateConflict: 'coordinate-conflict',
  CoreRecipeViolation: 'core-recipe-violation',
  InvalidResolvedPlot: 'invalid-resolved-plot',
} as const;

/** Chart resolution 错误码取值 */
export type ChartResolveErrorCodeValue = ValueOf<typeof ChartResolveErrorCode>;

type ChartResolveErrorOptions = {
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
  /** patch semantic target */
  target?: string;
  /** 发生冲突的 Plot member id */
  conflictingId?: string;
  /** 原始 schema 或 provider 错误 */
  cause?: unknown;
};

type ChartResolveErrorDetails = Readonly<{
  /** 用户可修正的结构化输入路径 */
  path: ReadonlyArray<string | number>;
  /** patch semantic target */
  target?: string;
  /** 发生冲突的 Plot member id */
  conflictingId?: string;
}>;

/** Chart resolver 对外提供的结构化内部错误 */
export class ChartResolveError extends RetikzError<ChartResolveErrorCodeValue, ChartResolveErrorDetails> {
  /** 稳定错误码 */
  readonly code: ChartResolveErrorCodeValue;
  /** 用户可修正的结构化输入路径 */
  readonly path: ReadonlyArray<string | number>;
  /** patch semantic target */
  readonly target?: string;
  /** 发生冲突的 Plot member id */
  readonly conflictingId?: string;
  /** 原始 schema 或 provider 错误 */
  override readonly cause?: unknown;

  /** 建立结构化 Chart resolution 错误 */
  constructor(code: ChartResolveErrorCodeValue, options: ChartResolveErrorOptions) {
    const details: ChartResolveErrorDetails = {
      path: options.path,
      ...(options.target === undefined ? {} : { target: options.target }),
      ...(options.conflictingId === undefined ? {} : { conflictingId: options.conflictingId }),
    };
    super({ code, message: `Chart resolution failed: ${code}`, details, cause: options.cause });
    this.name = 'ChartResolveError';
    this.code = code;
    this.path = options.path;
    this.target = options.target;
    this.conflictingId = options.conflictingId;
    this.cause = options.cause;
  }
}
