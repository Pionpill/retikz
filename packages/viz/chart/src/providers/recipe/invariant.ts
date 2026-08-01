import type { ValueOf } from '@retikz/core';

/** recipe 必需结构失败原因 */
export const ChartRecipeInvariantReason = {
  RequiredTransform: 'required-transform',
  RequiredScale: 'required-scale',
  SpatialRoot: 'spatial-root',
  CoreMark: 'core-mark',
} as const;

/** recipe 必需结构失败原因取值 */
export type ChartRecipeInvariantReasonValue = ValueOf<typeof ChartRecipeInvariantReason>;

/** provider 向 pipeline 报告的 typed recipe invariant */
export class ChartRecipeInvariantError extends Error {
  /** invariant 分类 */
  readonly reason: ChartRecipeInvariantReasonValue;
  /** 对应最终 Plot candidate 的结构化路径 */
  readonly path: ReadonlyArray<string | number>;

  /** 建立 recipe invariant 错误 */
  constructor(reason: ChartRecipeInvariantReasonValue, path: ReadonlyArray<string | number>) {
    super(`Chart recipe invariant failed: ${reason}`);
    this.name = 'ChartRecipeInvariantError';
    this.reason = reason;
    this.path = path;
  }
}
