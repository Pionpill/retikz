import { describe, expect, it } from 'vitest';

import { BubbleChartSchema } from '../../src/point/bubble';

const bubble = {
  namespace: 'chart',
  type: 'bubble',
  plot: { data: { reference: 'rows' } },
  config: {
    encoding: {
      x: { field: 'amount' },
      y: { field: 'margin' },
      size: { field: 'volume' },
    },
  },
} as const;

describe('Bubble Chart exact schema', () => {
  it('requires the Bubble size role inside config', () => {
    expect(BubbleChartSchema.parse(bubble)).toEqual(bubble);
    expect(() =>
      BubbleChartSchema.parse({
        ...bubble,
        config: { encoding: { x: { field: 'amount' }, y: { field: 'margin' } } },
      }),
    ).toThrow();
  });
});
