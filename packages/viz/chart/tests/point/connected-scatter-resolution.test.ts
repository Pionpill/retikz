import { describe, expect, it } from 'vitest';

import { resolvePointChartSpec } from '../../src/point';

describe('Connected Scatter Chart resolution', () => {
  it('keeps the connected path recipe inside canonical IRChart', () => {
    const result = resolvePointChartSpec({
      namespace: 'chart',
      type: 'connected-scatter',
      data: { reference: 'rows' },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        series: 'series',
        order: 'year',
      },
    });

    expect(result.chart.type).toBe('chart');
    expect(result.plotSpec.marks.some(mark => mark.type === 'path')).toBe(true);
  });
});
