import { describe, expect, it } from 'vitest';

import * as chart from '../../src';

const minimalPlot = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'rows' },
  scales: [{ type: 'linear', name: 'x' }],
  coordinate: { type: 'cartesian1D', x: 'x' },
  marks: [{ type: 'point', encoding: { x: { field: 'value', scale: 'x' } } }],
} as const;

describe('Base Chart schema', () => {
  it('owns the complete Plot without accepting type config', () => {
    expect(chart).toHaveProperty('BaseChartSchema');
    const schema = chart.BaseChartSchema;

    expect(
      schema.parse({
        namespace: 'chart',
        type: 'base',
        plot: minimalPlot,
      }),
    ).toMatchObject({ type: 'base', plot: minimalPlot });
    expect(() =>
      schema.parse({
        namespace: 'chart',
        type: 'base',
        plot: minimalPlot,
        config: {},
      }),
    ).toThrow();
  });
});
