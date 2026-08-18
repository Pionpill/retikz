import { describe, expect, it } from 'vitest';

import { ScatterChartSchema } from '../../src/point/scatter';

const scatter = {
  namespace: 'chart',
  type: 'scatter',
  plot: { data: { reference: 'rows' } },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
    },
  },
} as const;

describe('Scatter Chart exact schema', () => {
  it('keeps Plot-owned and Scatter-owned data in separate fields', () => {
    expect(ScatterChartSchema.parse(scatter)).toEqual(scatter);
    expect(() =>
      ScatterChartSchema.parse({
        namespace: 'chart',
        type: 'scatter',
        data: { reference: 'rows' },
        encoding: scatter.config.encoding,
      }),
    ).toThrow();
  });
});
