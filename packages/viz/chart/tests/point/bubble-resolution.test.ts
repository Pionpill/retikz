import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChart } from '../../src/_chart/resolve';
import { BubbleChartRecipe, BubbleChartSchema } from '../../src/point';

const resolve = (input: unknown) =>
  resolveChart(BubbleChartRecipe.bind(BubbleChartSchema.parse(input)), {
    theme: {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    },
  });

describe('Bubble Chart resolution', () => {
  it('resolves the required size role before producing IRBaseChart', () => {
    const result = resolve({
      namespace: 'chart',
      type: 'bubble',
      plot: { data: { reference: 'rows' } },
      config: {
        encoding: {
          x: { field: 'x' },
          y: { field: 'y' },
          size: { field: 'population' },
        },
      },
    });

    expect(result.chart.type).toBe('base');
    expect(result.plotSpec.marks[0]).toMatchObject({
      type: 'point',
      size: { kind: 'field', value: 'population' },
    });
  });
});
