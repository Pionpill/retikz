import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';

const base = {
  namespace: 'chart',
  type: 'scatter',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

describe('Chart identity', () => {
  it('从显式 Chart id 确定性派生 canonical Chart 与 Plot id', () => {
    const result = resolveChartSpec({ ...base, id: 'sales' });

    expect(result.plotSpec.id).toBe('sales/plot');
    expect(result.chart).toEqual({
      namespace: 'chart',
      type: 'chart',
      id: 'sales',
      plot: result.plotSpec,
    });
  });

  it('匿名 Chart 不生成计数 id', () => {
    const first = resolveChartSpec(base);
    const second = resolveChartSpec(base);

    expect(first.plotSpec.id).toBeUndefined();
    expect(first.chart).toEqual({ namespace: 'chart', type: 'chart', plot: first.plotSpec });
    expect(second.chart).toEqual(first.chart);
  });

  it('presentation item key 不拼接 Chart id，匿名实例不生成 synthetic id', () => {
    const presentation = {
      presentation: [
        { preset: 'subtitle', position: 'top', text: 'Quarterly' },
        { preset: 'title', position: 'bottom', text: 'Revenue' },
      ],
    } as const;
    const identified = resolveChartSpec({ ...base, id: 'sales' }, undefined, {}, presentation);
    const anonymous = resolveChartSpec(base, undefined, {}, presentation);

    expect(identified.chart).toMatchObject({
      namespace: 'chart',
      type: 'chart',
      id: 'sales',
      presentation: {
        children: [{ key: 'chart.presentation.subtitle' }, { key: 'chart.plot' }, { key: 'chart.presentation.title' }],
      },
    });
    expect(anonymous.chart).not.toHaveProperty('id');
    expect(JSON.stringify(anonymous.chart)).not.toContain('sales');
    expect(anonymous.chart).toMatchObject({
      presentation: {
        children: [{ key: 'chart.presentation.subtitle' }, { key: 'chart.plot' }, { key: 'chart.presentation.title' }],
      },
    });
  });
});
