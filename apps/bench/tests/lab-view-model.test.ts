import { describe, expect, it } from 'vitest';

import type { LabPolicyResult } from '../src/playground/modules/core';

import { LabLifecycleAvailability, LabOutcome, LabPolicyId, LabResultSource } from '../src/playground/modules/core';
import { createComparisonChartRows, createLabSummary } from '../src/playground/report/view-model';

const result = (policyId: LabPolicyResult['policyId'], medianMs: number, reused: number): LabPolicyResult => ({
  policyId,
  outcome: policyId === LabPolicyId.RetainedAuto ? LabOutcome.Incremental : LabOutcome.Full,
  source: policyId === LabPolicyId.StaticFull ? LabResultSource.StaticView : LabResultSource.RuntimeTrace,
  work: { visited: 5_000, reused, changed: 5_000 - reused, reuseRatio: reused / 5_000 },
  timing: { samples: 12, medianMs, p95Ms: medianMs, maxMs: medianMs },
  trace: [],
  diagnostics: [],
  lifecycle: { availability: LabLifecycleAvailability.Unavailable },
});

describe('Performance Lab summary view model', () => {
  it('把策略结果转换为 Plot 报告图使用的稳定数据行', () => {
    expect(
      createComparisonChartRows([
        result('static-full', 10, 0),
        result('retained-full', 8, 0),
        result('retained-auto', 2, 4_999),
      ]),
    ).toEqual([
      { policy: 's·full', median: 10, p95: 10 },
      { policy: 'r·full', median: 8, p95: 8 },
      { policy: 'r·auto', median: 2, p95: 2 },
    ]);
  });

  it('空结果保持可解释的等待状态', () => {
    expect(createLabSummary([])).toEqual({
      bestPolicyId: undefined,
      incrementalActive: false,
      speedupPercent: undefined,
    });
  });

  it('识别增量路径并计算相对 static 的中位数收益', () => {
    const summary = createLabSummary([
      result('static-full', 10, 0),
      result('retained-full', 8, 0),
      result('retained-auto', 2, 4_999),
    ]);
    expect(summary).toEqual({
      bestPolicyId: 'retained-auto',
      incrementalActive: true,
      speedupPercent: 80,
    });
  });
});
