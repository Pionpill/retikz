import { describe, expect, it } from 'vitest';

import { ConnectedScatterChartSchema } from '../../src/point/connected-scatter';

const connectedScatter = {
  namespace: 'chart',
  type: 'connected-scatter',
  plot: { data: { reference: 'rows' } },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
      order: 'month',
    },
  },
} as const;

describe('Connected Scatter Chart exact schema', () => {
  it('keeps connection semantics inside its own config', () => {
    expect(ConnectedScatterChartSchema.parse(connectedScatter)).toEqual(connectedScatter);
    expect(() =>
      ConnectedScatterChartSchema.parse({
        ...connectedScatter,
        config: {
          encoding: {
            x: { field: 'amount' },
            y: { field: 'margin' },
          },
        },
      }),
    ).toThrow();
  });
});
