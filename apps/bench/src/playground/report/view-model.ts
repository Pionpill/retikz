import type { LabPolicyIdValue, LabPolicyResult } from '../modules/core';

import { LabOutcome, LabPolicyId } from '../modules/core';

/** Performance Lab 顶部摘要的纯数据模型 */
export type LabSummary = Readonly<{
  bestPolicyId?: LabPolicyIdValue;
  incrementalActive: boolean;
  speedupPercent?: number;
}>;

/** Plot 报告图使用的策略 timing 数据行 */
export type ComparisonChartRow = Readonly<{
  policy: string;
  median: number;
  p95: number;
}>;

/** 把策略结果转换为可直接交给 Plot DSL 的数据行 */
export const createComparisonChartRows = (results: ReadonlyArray<LabPolicyResult>): ReadonlyArray<ComparisonChartRow> =>
  Object.freeze(
    results.map(result =>
      Object.freeze({
        policy: result.policyId.replace('retained-', 'r·').replace('static-', 's·'),
        median: Number(result.timing.medianMs.toFixed(3)),
        p95: Number(result.timing.p95Ms.toFixed(3)),
      }),
    ),
  );

/** 从一次运行结果提取最佳策略、增量命中与相对收益 */
export const createLabSummary = (results: ReadonlyArray<LabPolicyResult>): LabSummary => {
  if (results.length === 0) {
    return Object.freeze({ bestPolicyId: undefined, incrementalActive: false, speedupPercent: undefined });
  }
  const best = results.reduce((current, candidate) =>
    candidate.timing.medianMs < current.timing.medianMs ? candidate : current,
  );
  const staticResult = results.find(result => result.policyId === LabPolicyId.StaticFull);
  const autoResult = results.find(result => result.policyId === LabPolicyId.RetainedAuto);
  const speedupPercent =
    staticResult === undefined || autoResult === undefined || staticResult.timing.medianMs === 0
      ? undefined
      : Math.round((1 - autoResult.timing.medianMs / staticResult.timing.medianMs) * 1_000) / 10;
  return Object.freeze({
    bestPolicyId: best.policyId,
    incrementalActive: autoResult?.outcome === LabOutcome.Incremental && autoResult.work.reused > 0,
    speedupPercent,
  });
};
