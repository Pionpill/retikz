import { describe, expect, it } from 'vitest';

const base = {
  namespace: 'chart',
  type: 'base',
  plot: {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'rows' },
    scales: [],
    coordinate: { type: 'cartesian1D', x: 'x' },
    marks: [
      {
        type: 'point',
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
        },
      },
    ],
  },
} as const;

describe('Chart type dispatch', () => {
  it('binds the exact Base Chart schema as a BoundChart', async () => {
    const { bindChart } = await import('../../src/_chart/dispatch');
    const bound = bindChart(base);

    expect(bound.type).toBe('base');
    expect(bound.base).toMatchObject({ namespace: 'chart', type: 'base' });
    expect(bound.plot).toEqual(base.plot);
  });

  it.each(['scatter', 'unknown'])('rejects non-Base type %s at the type field', async type => {
    const { bindChart, ChartResolveErrorCode } = await import('../../src/_chart/dispatch');

    try {
      bindChart({ ...base, type });
      expect.unreachable('bindChart should reject an unknown type');
    } catch (error) {
      expect(error).toMatchObject({ code: ChartResolveErrorCode.UnknownType, path: ['type'] });
    }
  });
});
