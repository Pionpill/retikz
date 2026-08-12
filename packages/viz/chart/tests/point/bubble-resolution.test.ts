import { describe, expect, it } from 'vitest';

import { resolvePointChartSpec } from '../../src/point';

describe('Bubble Chart resolution', () => {
  it('resolves the required size role before producing canonical IRChart', () => {
    const result = resolvePointChartSpec({
      namespace: 'chart',
      type: 'bubble',
      data: { reference: 'rows' },
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
        size: { field: 'population' },
      },
    });

    expect(result.chart.type).toBe('chart');
    expect(result.plotSpec.marks[0]).toMatchObject({
      type: 'point',
      size: { kind: 'field', value: 'population' },
    });
  });
});
