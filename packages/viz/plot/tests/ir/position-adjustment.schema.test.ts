import { describe, expect, it } from 'vitest';

import { MarkOperationSchema, PointMarkSchema } from '../../src/schemas';

const point = {
  type: 'point',
  encoding: { x: { field: 'category' }, y: { field: 'value' } },
};

describe('Position Adjustment schema', () => {
  it('accepts JSON-safe numeric and ratio jitter on Point', () => {
    const operations = [
      { kind: 'jitter', role: 'x', span: 12, seed: 7 },
      { kind: 'jitter', span: { kind: 'ratio', value: 1 } },
    ];
    const parsed = PointMarkSchema.parse({ ...point, placement: { adjustments: operations } });
    expect(JSON.parse(JSON.stringify(parsed.placement?.adjustments))).toEqual(operations);
  });

  it('accepts uniform and normal jitter distributions as JSON-safe values', () => {
    const operations = [
      { kind: 'jitter', role: 'x', distribution: { kind: 'uniform' } },
      { kind: 'jitter', role: 'x', distribution: { kind: 'normal' } },
      { kind: 'jitter', role: 'x', distribution: { kind: 'normal', sigma: 0.75 } },
    ];
    const parsed = PointMarkSchema.parse({ ...point, placement: { adjustments: operations } });

    expect(JSON.parse(JSON.stringify(parsed.placement?.adjustments))).toEqual(operations);
  });

  it('rejects unknown distribution fields, kinds, and invalid normal sigma', () => {
    const invalidOperations = [
      { kind: 'jitter', distribution: { kind: 'uniform', sigma: 0.5 } },
      { kind: 'jitter', distribution: { kind: 'normal', extra: true } },
      { kind: 'jitter', distribution: { kind: 'exponential' } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: 0 } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: -1 } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: Number.NaN } },
      { kind: 'jitter', distribution: { kind: 'normal', sigma: Number.POSITIVE_INFINITY } },
    ];

    for (const operation of invalidOperations) {
      expect(() => PointMarkSchema.parse({ ...point, placement: { adjustments: [operation] } })).toThrow();
    }
  });

  it('rejects invalid ratio and extra built-in fields', () => {
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        placement: { adjustments: [{ kind: 'jitter', span: { kind: 'ratio', value: 1.01 } }] },
      }),
    ).toThrow();
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        placement: { adjustments: [{ kind: 'jitter', span: 1, extra: true }] },
      }),
    ).toThrow();
  });

  it('preserves custom JSON operations and rejects non-JSON values', () => {
    const parsed = PointMarkSchema.parse({
      ...point,
      placement: { adjustments: [{ kind: 'screen-nudge', dx: 4 }] },
    });
    expect(parsed.placement?.adjustments).toEqual([{ kind: 'screen-nudge', dx: 4 }]);
    expect(() =>
      PointMarkSchema.parse({
        ...point,
        placement: { adjustments: [{ kind: 'screen-nudge', callback: () => 1 }] },
      }),
    ).toThrow();
  });

  it('does not add placement to unsupported built-in marks', () => {
    expect(() =>
      MarkOperationSchema.parse({
        type: 'interval',
        bounds: { x: { kind: 'band' }, y: { kind: 'extent', start: 0, end: 'value' } },
        encoding: { x: { field: 'category' }, y: { field: 'value' } },
        placement: { adjustments: [{ kind: 'jitter', role: 'x' }] },
      }),
    ).toThrow();
  });
});
