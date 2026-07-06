import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { ExternalRow } from '../../src';

import {
  applyTransforms,
  DEFAULT_TRANSFORM_CONTEXT,
  defineStatisticsReducer,
  defineTransform,
  readSourceIndices,
  resolveStatisticsReducerRegistry,
  resolveTransformRegistry,
  tagSourceIndex,
} from '../../src';

const SALES: Array<ExternalRow> = [
  { month: 'Jan', product: 'A', revenue: 3 },
  { month: 'Jan', product: 'B', revenue: 5 },
  { month: 'Feb', product: 'A', revenue: 2 },
  { month: 'Feb', product: 'B', revenue: 4 },
];

describe('data transform runtime', () => {
  it('keeps shared sort output stable and leaves plot-only transforms to host registries', () => {
    const sorted = applyTransforms(
      [
        { m: 3 },
        { m: 1 },
        { m: 2 },
      ],
      [{ kind: 'sort', field: 'm' }],
    );

    expect(sorted.map(row => row.m)).toEqual([1, 2, 3]);
    expect(() =>
      applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }]),
    ).toThrow(/not registered/);
  });

  it('executes custom transform through the same registry', () => {
    const doubleRevenue = defineTransform({
      schema: z.object({
        kind: z.literal('double-revenue'),
        field: z.string().min(1),
        as: z.string().min(1),
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      apply: (rows, operation) => rows.map(row => ({ ...row, [operation.as]: Number(row[operation.field]) * 2 })),
    });

    const out = applyTransforms(
      [{ revenue: 3 }],
      [{ kind: 'double-revenue', field: 'revenue', as: 'doubleRevenue' }],
      resolveTransformRegistry([doubleRevenue]),
    );

    expect(out).toEqual([{ revenue: 3, doubleRevenue: 6 }]);
  });

  it('fails loud for unknown and duplicate transform registrations', () => {
    const custom = defineTransform({
      schema: z.object({ kind: z.literal('custom'), value: z.number() }),
      apply: rows => rows,
    });

    expect(() =>
      applyTransforms([{ value: 1 }], [{ kind: 'missing', value: 1 }]),
    ).toThrow(/not registered/);
    expect(() => resolveTransformRegistry([custom, custom])).toThrow(/duplicate transform registration/);
  });

  it('preserves group provenance through summarize', () => {
    const out = applyTransforms(tagSourceIndex(SALES), [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ op: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[1])).toEqual([2, 3]);
  });

  it('uses custom statistics reducer registry from transform context', () => {
    const range = defineStatisticsReducer({
      schema: z.object({
        op: z.literal('range'),
        field: z.string().min(1),
        as: z.string().min(1),
      }),
      inputFields: operation => [operation.field],
      outputFields: operation => [operation.as],
      reduce: (rows, operation) => {
        const values = rows.map(row => Number(row[operation.field]));
        return { [operation.as]: Math.max(...values) - Math.min(...values) };
      },
    });

    const out = applyTransforms(
      SALES,
      [
        {
          kind: 'summarize',
          groupBy: ['month'],
          metrics: [{ op: 'range', field: 'revenue', as: 'revenueRange' }],
        },
      ],
      undefined,
      { ...DEFAULT_TRANSFORM_CONTEXT, statisticsReducerRegistry: resolveStatisticsReducerRegistry([range]) },
    );

    expect(out).toEqual([
      expect.objectContaining({ month: 'Jan', revenueRange: 2 }),
      expect.objectContaining({ month: 'Feb', revenueRange: 2 }),
    ]);
  });
});
