import type { ValueOf } from '@retikz/core';

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

/** Chart resolver 对外提供的结构化内部错误 */
export class ChartResolveError extends Error {
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
    super(`Chart resolution failed: ${code}`);
    this.name = 'ChartResolveError';
    this.code = code;
    this.path = options.path;
    this.target = options.target;
    this.conflictingId = options.conflictingId;
    this.cause = options.cause;
  }
}
