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
  it('keeps shared sort output stable and leaves host-only transforms to host registries', () => {
    const sorted = applyTransforms([{ m: 3 }, { m: 1 }, { m: 2 }], [{ kind: 'sort', field: 'm' }]);

    expect(sorted.map(row => row.m)).toEqual([1, 2, 3]);
    expect(() => applyTransforms(SALES, [{ kind: 'stack', x: 'month', y: 'revenue', groupBy: 'product' }])).toThrow(
      /not registered/,
    );
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

    expect(() => applyTransforms([{ value: 1 }], [{ kind: 'missing', value: 1 }])).toThrow(/not registered/);
    expect(() => resolveTransformRegistry([custom, custom])).toThrow(/duplicate transform registration/);
  });

  it('preserves group provenance through summarize', () => {
    const out = applyTransforms(tagSourceIndex(SALES), [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[1])).toEqual([2, 3]);
  });

  it('uses custom statistics reducer registry from transform context', () => {
    const range = defineStatisticsReducer({
      schema: z.object({
        kind: z.literal('range'),
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
          metrics: [{ kind: 'range', field: 'revenue', as: 'revenueRange' }],
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

  it('uses tie last for the final threshold row in top and bottom selectors', () => {
    const rows: Array<ExternalRow> = [
      { id: 'A', score: 10 },
      { id: 'B', score: 9 },
      { id: 'C', score: 9 },
      { id: 'D', score: 8 },
    ];

    expect(
      applyTransforms(rows, [{ kind: 'select', selector: { kind: 'top', by: 'score', n: 2 } }]).map(row => row.id),
    ).toEqual(['A', 'B']);
    expect(
      applyTransforms(rows, [{ kind: 'select', selector: { kind: 'top', by: 'score', n: 2, tie: 'last' } }]).map(
        row => row.id,
      ),
    ).toEqual(['A', 'C']);
    expect(
      applyTransforms(rows, [{ kind: 'select', selector: { kind: 'top', by: 'score', n: 2, tie: 'all' } }]).map(
        row => row.id,
      ),
    ).toEqual(['A', 'B', 'C']);

    const bottomRows: Array<ExternalRow> = [
      { id: 'A', score: 1 },
      { id: 'B', score: 2 },
      { id: 'C', score: 2 },
      { id: 'D', score: 3 },
    ];

    expect(
      applyTransforms(bottomRows, [{ kind: 'select', selector: { kind: 'bottom', by: 'score', n: 2 } }]).map(
        row => row.id,
      ),
    ).toEqual(['A', 'B']);
    expect(
      applyTransforms(bottomRows, [
        { kind: 'select', selector: { kind: 'bottom', by: 'score', n: 2, tie: 'last' } },
      ]).map(row => row.id),
    ).toEqual(['A', 'C']);
    expect(
      applyTransforms(bottomRows, [
        { kind: 'select', selector: { kind: 'bottom', by: 'score', n: 2, tie: 'all' } },
      ]).map(row => row.id),
    ).toEqual(['A', 'B', 'C']);
  });

  it('keeps missing order values last for ascending and descending selectors', () => {
    const rows: Array<ExternalRow> = [
      { id: 'missing-undefined' },
      { id: 'two', value: 2 },
      { id: 'one', value: 1 },
      { id: 'invalid-nan', value: Number.NaN },
      { id: 'missing-null', value: null },
    ];

    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          selector: { kind: 'first', orderBy: [{ field: 'value', order: 'descending' }] },
        },
      ])[0]?.id,
    ).toBe('two');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          selector: { kind: 'nth', orderBy: [{ field: 'value', order: 'descending' }], index: 1 },
        },
      ])[0]?.id,
    ).toBe('one');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          selector: { kind: 'last', orderBy: [{ field: 'value', order: 'descending' }] },
        },
      ])[0]?.id,
    ).toBe('missing-null');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          selector: { kind: 'first', orderBy: [{ field: 'value', order: 'ascending' }] },
        },
      ])[0]?.id,
    ).toBe('one');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          selector: { kind: 'last', orderBy: [{ field: 'value', order: 'ascending' }] },
        },
      ])[0]?.id,
    ).toBe('missing-null');
  });

  it('keeps missing and non-finite sort values last in both directions', () => {
    const rows: Array<ExternalRow> = [
      { id: 'missing-undefined' },
      { id: 'two', value: 2 },
      { id: 'invalid-nan', value: Number.NaN },
      { id: 'one', value: 1 },
      { id: 'missing-null', value: null },
    ];

    expect(applyTransforms(rows, [{ kind: 'sort', field: 'value' }]).map(row => row.id)).toEqual([
      'one',
      'two',
      'missing-undefined',
      'invalid-nan',
      'missing-null',
    ]);
    expect(applyTransforms(rows, [{ kind: 'sort', field: 'value', order: 'descending' }]).map(row => row.id)).toEqual([
      'two',
      'one',
      'missing-undefined',
      'invalid-nan',
      'missing-null',
    ]);
  });
});
