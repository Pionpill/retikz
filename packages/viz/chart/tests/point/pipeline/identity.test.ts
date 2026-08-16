import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChart } from '../../../src/_chart/resolve';
import { ScatterChartRecipe, ScatterChartSchema } from '../../../src/point';

const base = {
  namespace: 'chart',
  type: 'scatter',
  plot: { data: { reference: 'rows' } },
  config: { encoding: { x: { field: 'amount' }, y: { field: 'margin' } } },
} as const;

const resolve = (input: unknown) =>
  resolveChart(ScatterChartRecipe.bind(ScatterChartSchema.parse(input)), {
    theme: {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    },
  });

describe('Point Chart identity', () => {
  it('从显式 Chart id 确定性派生 canonical Chart 与 Plot id', () => {
    const result = resolve({ ...base, id: 'sales' });

    expect(result.plotSpec.id).toBe('sales/plot');
    expect(result.chart).toEqual({
      namespace: 'chart',
      type: 'base',
      id: 'sales',
      plot: result.plotSpec,
    });
  });

  it('匿名 Chart 不生成计数 id', () => {
    const first = resolve(base);
    const second = resolve(base);

    expect(first.plotSpec.id).toBeUndefined();
    expect(first.chart).toEqual({ namespace: 'chart', type: 'base', plot: first.plotSpec });
    expect(second.chart).toEqual(first.chart);
  });

  it('presentation item key 不拼接 Chart id，匿名实例不生成 synthetic id', () => {
    const presentation = {
      children: [
        {
          kind: 'preset',
          key: 'chart.presentation.subtitle',
          preset: 'subtitle',
          text: 'Quarterly',
        },
        { kind: 'plot', key: 'chart.plot' },
        {
          kind: 'preset',
          key: 'chart.presentation.title',
          preset: 'title',
          text: 'Revenue',
        },
      ],
    } as const;
    const identified = resolve({ ...base, id: 'sales', presentation });
    const anonymous = resolve({ ...base, presentation });

    expect(identified.chart).toMatchObject({
      namespace: 'chart',
      type: 'base',
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
