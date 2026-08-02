import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import type { LabPolicyResult } from '../src/playground/modules/kernel';

import { BenchmarkView } from '../src/playground/app/case/BenchmarkView';
import { createInitialLabState, reduceLabState } from '../src/playground/app/lab-state';
import { getBenchTestCase } from '../src/playground/app/test-catalog';
import {
  LabBackend,
  LabLifecycleAvailability,
  LabOutcome,
  LabPolicyId,
  LabResultSource,
  LabRunMode,
} from '../src/playground/modules/kernel';
import { Inspector, ReportDashboard, ReportHistory } from '../src/playground/report';

const createResult = (policyId: LabPolicyResult['policyId'], medianMs: number, reused: number): LabPolicyResult => ({
  policyId,
  outcome: policyId === LabPolicyId.RetainedAuto ? LabOutcome.Incremental : LabOutcome.Full,
  source: policyId === LabPolicyId.StaticFull ? LabResultSource.StaticView : LabResultSource.RuntimeTrace,
  work: { visited: 5_000, reused, changed: 5_000 - reused, reuseRatio: reused / 5_000 },
  timing: { samples: 12, medianMs, p95Ms: medianMs * 1.1, maxMs: medianMs * 1.2 },
  trace: [],
  diagnostics: [],
  lifecycle: { availability: LabLifecycleAvailability.Unavailable },
});

const results = [
  createResult(LabPolicyId.StaticFull, 50, 0),
  createResult(LabPolicyId.RetainedFull, 700, 0),
  createResult(LabPolicyId.RetainedAuto, 100, 4_999),
];

const createI18n = async () => {
  const i18n = createInstance().use(initReactI18next);
  await i18n.init({
    lng: 'zh',
    resources: {
      zh: {
        translation: {
          policy: {
            'static-full': '静态 · 全量',
            'retained-full': '保留模式 · 全量',
            'retained-auto': '保留模式 · 自动',
          },
          metrics: {
            medianUpdate: '更新中位数',
            entitiesReused: '复用实体',
            executionPath: '执行路径',
            autoVsStatic: '自动策略对比静态策略',
            faster: '快 {{value}}%',
            slower: '慢 {{value}}%',
            samples: '{{count}} 次采样',
            reuse: '复用率 {{value}}%',
            best: '最佳：{{policy}}',
          },
          chart: {
            title: '策略对比',
            description: '更新耗时中位数 · 越低越好',
            localWallClock: '本机挂钟时间',
          },
          inspector: {
            title: '运行时检查器',
            trace: 'Trace',
            patch: 'Scene Patch',
            diagnostics: '诊断',
            lifecycle: '生命周期',
            noData: '暂无数据',
            traceRecord: '{{owner}} {{phase}} {{outcome}} {{visited}} {{reused}}',
            noPatch: '完整路径 · 无 Scene Patch',
            patchSummary: '{{count}} 个操作 {{kinds}}',
            noDiagnostics: '无诊断',
            lifecycleUnavailable: '当前实验未采集生命周期探针',
          },
          report: { awaiting: '等待运行' },
          reportHistory: { title: '本地报告' },
        },
      },
    },
  });
  return i18n;
};

describe('Performance Lab report dashboard', () => {
  it('在一个主面板中区分主指标、辅助指标与策略图表', async () => {
    const i18n = await createI18n();
    const markup = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(ReportDashboard, { results })),
    );

    expect(markup.match(/data-slot="lab-report-dashboard"/g)).toHaveLength(1);
    expect(markup.match(/data-slot="lab-metric-primary"/g)).toHaveLength(1);
    expect(markup.match(/data-slot="lab-metric-supporting"/g)).toHaveLength(3);
    expect(markup).toContain('data-slot="lab-comparison-chart"');
    expect(markup).toContain('最佳：静态 · 全量');
  });

  it('将运行时信息拆分为四张独立诊断卡', async () => {
    const i18n = await createI18n();
    const markup = renderToStaticMarkup(
      createElement(I18nextProvider, { i18n }, createElement(Inspector, { result: results[2] })),
    );

    expect(markup).toContain('data-slot="lab-inspector"');
    expect(markup).toContain('data-slot="lab-inspector-grid"');
    expect(markup.match(/data-slot="lab-inspector-card"/g)).toHaveLength(4);
    expect(markup.match(/data-slot="lab-inspector-card-title" class="[^"]*text-foreground/g)).toHaveLength(4);
  });

  it('让当前基准与历史报告复用同一个主仪表盘', async () => {
    const i18n = await createI18n();
    const testCase = getBenchTestCase('kernel', 'node-selection');
    if (testCase === undefined) throw new Error('Kernel default case is unavailable');
    const session = {
      id: 'benchmark-1',
      mode: LabRunMode.Benchmark,
      scenarioId: testCase.scenarioId,
      backend: LabBackend.Svg,
      startedAt: 1,
      results,
    } as const;
    const state = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    const render = (element: ReturnType<typeof createElement>) =>
      renderToStaticMarkup(createElement(I18nextProvider, { i18n }, element));

    const benchmarkMarkup = render(createElement(BenchmarkView, { testCase, state, onRun: () => undefined }));
    const historyMarkup = render(createElement(ReportHistory, { session }));

    expect(benchmarkMarkup.match(/data-slot="lab-report-dashboard"/g)).toHaveLength(1);
    expect(historyMarkup.match(/data-slot="lab-report-dashboard"/g)).toHaveLength(1);
  });
});
