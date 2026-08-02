import { describe, expect, it } from 'vitest';

import type { LabPolicyResult } from '../src/playground/modules/kernel';

import { LabLifecycleAvailability, LabOutcome, LabPolicyId, LabResultSource } from '../src/playground/modules/kernel';
import { createComparisonChartRows, createLabSummary, getLabRunSessionPayload } from '../src/playground/report';

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
  it('使用调用方提供的策略翻译生成 Plot 报告图数据行', () => {
    const policyLabels: Record<LabPolicyResult['policyId'], string> = {
      [LabPolicyId.StaticFull]: '静态 · 全量',
      [LabPolicyId.RetainedFull]: '保留模式 · 全量',
      [LabPolicyId.RetainedAuto]: '保留模式 · 自动',
    };
    expect(
      createComparisonChartRows(
        [result('static-full', 10, 0), result('retained-full', 8, 0), result('retained-auto', 2, 4_999)],
        policyId => policyLabels[policyId],
      ),
    ).toEqual([
      { policy: '静态 · 全量', median: 10, p95: 10 },
      { policy: '保留模式 · 全量', median: 8, p95: 8 },
      { policy: '保留模式 · 自动', median: 2, p95: 2 },
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

  it('只从完整报告中读取可安全展示的运行会话', () => {
    const session = {
      id: 'session-1',
      mode: 'benchmark',
      scenarioId: 'single-entity-update',
      backend: 'svg',
      startedAt: 1,
      results: [result('retained-auto', 2, 4_999)],
    } as const;
    const report = {
      schemaVersion: 1 as const,
      runId: 'run-1',
      moduleId: 'kernel',
      caseId: 'single-entity-update',
      status: 'passed' as const,
      startedAt: '2026-08-01T00:00:00.000Z',
      completedAt: '2026-08-01T00:00:01.000Z',
      payload: session,
    };

    expect(getLabRunSessionPayload(report)).toEqual(session);
    expect(getLabRunSessionPayload({ ...report, payload: { error: 'failed' } })).toBeUndefined();
    expect(
      getLabRunSessionPayload({
        ...report,
        payload: {
          ...session,
          results: [
            {
              ...session.results[0],
              work: { visited: 1, reused: 2, changed: -1, reuseRatio: 2 },
            },
          ],
        },
      }),
    ).toBeUndefined();
    expect(
      getLabRunSessionPayload({
        ...report,
        payload: { ...session, results: [session.results[0], session.results[0]] },
      }),
    ).toBeUndefined();
  });
});
