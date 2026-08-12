import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../../src/resolution';

describe('Scatter Chart resolution', () => {
  it('resolves typed input to one canonical chart.chart over a complete PlotSpec', () => {
    const result = resolveChartSpec(
      {
        namespace: 'chart',
        type: 'scatter',
        id: 'sales',
        data: { reference: 'rows' },
        encoding: { x: { field: 'x' }, y: { field: 'y' } },
      },
      undefined,
      {},
      { title: 'Sales', source: 'Internal' },
    );

    expect(result.chart).toMatchObject({
      namespace: 'chart',
      type: 'chart',
      id: 'sales',
      plot: {
        namespace: 'plot',
        type: 'plot',
        id: 'sales/plot',
        marks: [{ type: 'point', id: '__chart.scatter.mark.main' }],
      },
      presentation: {
        children: [{ preset: 'title' }, { kind: 'plot', key: 'chart.plot' }, { preset: 'source' }],
      },
    });
  });

  it('keeps authored point channels and required x/y recipe members', () => {
    const plot = resolveChartSpec({
      namespace: 'chart',
      type: 'scatter',
      data: { reference: 'rows' },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        color: { field: 'region' },
        size: { field: 'weight' },
      },
    }).plotSpec;

    expect(plot.marks[0]).toMatchObject({
      type: 'point',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
      },
      color: { kind: 'field', value: 'region' },
      size: { kind: 'field', value: 'weight' },
    });
  });
});
