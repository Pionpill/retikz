import { describe, expect, it } from 'vitest';

import { BaseChartSchema } from '../../../src';
import { BubbleChartSchema } from '../../../src/point/bubble';
import { ConnectedScatterChartSchema } from '../../../src/point/connected-scatter';
import { ScatterChartSchema } from '../../../src/point/scatter';

const plot = { data: { reference: 'd' } } as const;

describe('Chart theme token ownership', () => {
  it('keeps Chart tokens at the Chart root and Plot tokens inside plot', () => {
    const scatter = {
      namespace: 'chart',
      type: 'scatter',
      chartThemeTokens: { 'chart.axis.enabled': false },
      plot: {
        ...plot,
        plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
      },
      config: { encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    } as const;

    expect(ScatterChartSchema.safeParse(scatter).success).toBe(true);
    expect(ScatterChartSchema.safeParse({ ...scatter, plotThemeTokens: scatter.plot.plotThemeTokens }).success).toBe(
      false,
    );
    expect(ScatterChartSchema.safeParse({ ...scatter, plot: { ...plot, chartThemeTokens: {} } }).success).toBe(false);
  });

  it('lets every exact schema reject legacy style and themeMode fields', () => {
    const variants = [
      [
        ScatterChartSchema,
        { namespace: 'chart', type: 'scatter', plot, config: { encoding: { x: { field: 'x' }, y: { field: 'y' } } } },
      ],
      [
        BubbleChartSchema,
        {
          namespace: 'chart',
          type: 'bubble',
          plot,
          config: { encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { field: 'size' } } },
        },
      ],
      [
        ConnectedScatterChartSchema,
        {
          namespace: 'chart',
          type: 'connected-scatter',
          plot,
          config: { encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'order' } },
        },
      ],
    ] as const;

    for (const [schema, spec] of variants) {
      expect(schema.safeParse({ ...spec, style: 'clean' }).success).toBe(false);
      expect(schema.safeParse({ ...spec, themeMode: 'dark' }).success).toBe(false);
    }
  });

  it('keeps Base strict and rejects config', () => {
    const base = {
      namespace: 'chart',
      type: 'base',
      plot: {
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'd' },
        scales: [{ type: 'linear', name: 'x' }],
        coordinate: { type: 'cartesian1D', x: 'x' },
        marks: [{ type: 'point', encoding: { x: { field: 'x', scale: 'x' } } }],
      },
    } as const;

    expect(BaseChartSchema.safeParse(base).success).toBe(true);
    expect(BaseChartSchema.safeParse({ ...base, config: {} }).success).toBe(false);
  });
});
