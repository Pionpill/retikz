import { createInstance } from 'i18next';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';

import type { LabPolicyResult } from '../src/playground/modules/kernel';

import { LabLifecycleAvailability, LabOutcome, LabPolicyId, LabResultSource } from '../src/playground/modules/kernel';
import { ComparisonChart, ComparisonPlot } from '../src/playground/report';

const result = (policyId: LabPolicyResult['policyId'], medianMs: number): LabPolicyResult => ({
  policyId,
  outcome: policyId === LabPolicyId.RetainedAuto ? LabOutcome.Incremental : LabOutcome.Full,
  source: policyId === LabPolicyId.StaticFull ? LabResultSource.StaticView : LabResultSource.RuntimeTrace,
  work: { visited: 5_000, reused: 0, changed: 5_000, reuseRatio: 0 },
  timing: { samples: 12, medianMs, p95Ms: medianMs, maxMs: medianMs },
  trace: [],
  diagnostics: [],
  lifecycle: { availability: LabLifecycleAvailability.Unavailable },
});

describe('Performance Lab comparison Plot', () => {
  it('使用当前语言的策略翻译输出 X 轴标签', async () => {
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
            chart: {
              title: '策略对比',
              description: '更新耗时中位数 · 越低越好',
              localWallClock: '本机挂钟时间',
            },
          },
        },
      },
    });
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(ComparisonChart, {
          results: [
            result(LabPolicyId.StaticFull, 10),
            result(LabPolicyId.RetainedFull, 8),
            result(LabPolicyId.RetainedAuto, 2),
          ],
        }),
      ),
    );

    expect(markup).toContain('静态 · 全量');
    expect(markup).toContain('保留模式 · 全量');
    expect(markup).toContain('保留模式 · 自动');
    expect(markup).not.toContain('static-full');
  });

  it('通过 retikz Plot 输出策略柱形与坐标文字', () => {
    const svg = renderToStaticMarkup(
      createElement(ComparisonPlot, {
        rows: [
          { policy: 's·full', median: 10, p95: 12 },
          { policy: 'r·auto', median: 2, p95: 3 },
        ],
        width: 360,
        height: 220,
      }),
    );

    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
    expect(svg).toContain('fill="#93c5fd"');
    expect(svg).toContain('s·full');
    expect(svg).toContain('r·auto');
  });

  it('单策略报告保持可比较的窄柱形', () => {
    const svg = renderToStaticMarkup(
      createElement(ComparisonPlot, {
        rows: [{ policy: 'r·auto', median: 194.2, p95: 200 }],
        width: 381,
        height: 199,
      }),
    );
    const bar = svg.match(/<rect[^>]*fill="#93c5fd"[^>]*>/)?.[0];
    const width = bar?.match(/width="([^"]+)"/)?.[1];

    expect(Number(width)).toBeLessThan(100);
  });
});
