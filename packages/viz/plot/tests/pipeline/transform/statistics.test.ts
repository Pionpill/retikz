import type { AnyTransformDefinition, ExternalRow, TransformContext } from '@retikz/data';

import {
  applyTransforms as applyDataTransforms,
  DEFAULT_TRANSFORM_CONTEXT,
  defineRowSelector,
  defineStatisticsReducer,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
} from '@retikz/data';
import { readSourceIndex, readSourceIndices, tagSourceIndex } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resolvePlotTransformRegistry } from '../../../src/providers';

const PLOT_TRANSFORM_REGISTRY = resolvePlotTransformRegistry();

const applyTransforms = (
  rows: Array<ExternalRow>,
  operations?: Parameters<typeof applyDataTransforms>[1],
  registry: ReadonlyMap<string, AnyTransformDefinition> = PLOT_TRANSFORM_REGISTRY,
  context?: TransformContext,
): Array<ExternalRow> => applyDataTransforms(rows, operations, registry, context);

const ORDERS: Array<ExternalRow> = [
  { region: 'N', product: 'A', revenue: 3 },
  { region: 'N', product: 'B', revenue: 5 },
  { region: 'S', product: 'A', revenue: 2 },
  { region: 'S', product: 'A', revenue: 4 },
];

describe('statistical transform algebra (contract)', () => {
  it('summarize_multiple_metrics', () => {
    const out = applyTransforms(ORDERS, [
      {
        kind: 'summarize',
        groupBy: ['region'],
        metrics: [
          { kind: 'mean', field: 'revenue', as: 'avgRevenue' },
          { kind: 'median', field: 'revenue', as: 'medianRevenue' },
          { kind: 'count', as: 'orders' },
        ],
      },
    ]);

    expect(out).toEqual([
      { region: 'N', avgRevenue: 4, medianRevenue: 4, orders: 2 },
      { region: 'S', avgRevenue: 3, medianRevenue: 3, orders: 2 },
    ]);
  });

  it('summarize_global_group_and_group_provenance', () => {
    const out = applyTransforms(tagSourceIndex(ORDERS), [
      {
        kind: 'summarize',
        metrics: [
          { kind: 'count', as: 'orders' },
          { kind: 'sum', field: 'revenue', as: 'totalRevenue' },
        ],
      },
    ]);

    expect(out).toEqual([expect.objectContaining({ orders: 4, totalRevenue: 14 })]);
    expect(readSourceIndices(out[0])).toEqual([0, 1, 2, 3]);
  });

  it('select_group_max_preserves_row_and_source_index', () => {
    const out = applyTransforms(tagSourceIndex(ORDERS), [
      {
        kind: 'select',
        groupBy: ['region'],
        selector: { kind: 'max', by: 'revenue', tie: 'first' },
      },
    ]);

    expect(out).toEqual([
      expect.objectContaining({ region: 'N', product: 'B', revenue: 5 }),
      expect.objectContaining({ region: 'S', product: 'A', revenue: 4 }),
    ]);
    expect(readSourceIndex(out[0])).toBe(1);
    expect(readSourceIndex(out[1])).toBe(3);
  });

  it('select_top_n_writes_rank', () => {
    const out = applyTransforms(ORDERS, [
      {
        kind: 'select',
        groupBy: ['region'],
        selector: { kind: 'top', by: 'revenue', n: 2 },
        rankAs: 'rank',
      },
    ]);

    expect(out.map(row => [row.region, row.revenue, row.rank])).toEqual([
      ['N', 5, 1],
      ['N', 3, 2],
      ['S', 4, 1],
      ['S', 2, 2],
    ]);
  });

  it('annotate_group_mean_preserves_rows', () => {
    const out = applyTransforms(ORDERS, [
      {
        kind: 'annotate',
        groupBy: ['region'],
        metrics: [{ kind: 'mean', field: 'revenue', as: 'regionMean' }],
      },
    ]);

    expect(out.length).toBe(ORDERS.length);
    expect(out.map(row => [row.region, row.revenue, row.regionMean])).toEqual([
      ['N', 3, 4],
      ['N', 5, 4],
      ['S', 2, 3],
      ['S', 4, 3],
    ]);
  });

  it('annotate_selector_broadcasts_selected_value', () => {
    const out = applyTransforms(ORDERS, [
      {
        kind: 'annotate',
        groupBy: ['region'],
        selectors: [{ selector: { kind: 'max', by: 'revenue' }, as: 'regionMax' }],
      },
    ]);

    expect(out.length).toBe(ORDERS.length);
    expect(out.map(row => [row.region, row.revenue, row.regionMax])).toEqual([
      ['N', 3, 5],
      ['N', 5, 5],
      ['S', 2, 4],
      ['S', 4, 4],
    ]);
  });

  it('relate_min_to_max_per_group', () => {
    const out = applyTransforms(
      [
        { series: 'A', id: 'a1', month: 1, value: 10 },
        { series: 'A', id: 'a2', month: 2, value: 4 },
        { series: 'A', id: 'a3', month: 3, value: 15 },
        { series: 'B', id: 'b1', month: 1, value: 8 },
        { series: 'B', id: 'b2', month: 2, value: 12 },
      ],
      [
        {
          kind: 'relate',
          groupBy: ['series'],
          source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
          target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
          measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
        },
      ],
    );

    expect(out).toEqual([
      expect.objectContaining({
        series: 'A',
        sourceX: 2,
        sourceY: 4,
        sourceId: 'a2',
        targetX: 3,
        targetY: 15,
        targetId: 'a3',
        delta: 11,
        deltaLabel: '+11',
      }),
      expect.objectContaining({
        series: 'B',
        sourceX: 1,
        sourceY: 8,
        sourceId: 'b1',
        targetX: 2,
        targetY: 12,
        targetId: 'b2',
        delta: 4,
        deltaLabel: '+4',
      }),
    ]);
  });

  it('bin_metrics_use_shared_reducers', () => {
    const out = applyTransforms(
      [
        { x: 1, weight: 10 },
        { x: 2, weight: 20 },
        { x: 8, weight: 5 },
      ],
      [
        {
          kind: 'bin',
          field: 'x',
          step: 5,
          metrics: [
            { kind: 'count', as: 'binCount' },
            { kind: 'mean', field: 'weight', as: 'binMean' },
          ],
        },
      ],
    );

    expect(out.map(row => [row.binStart, row.binEnd, row.binCount, row.binMean])).toEqual([
      [1, 6, 2, 15],
      [6, 11, 1, 5],
    ]);
  });

  it('custom_stat_reducer_in_summarize', () => {
    const weightedMean = defineStatisticsReducer({
      schema: z.object({
        kind: z.literal('weighted-mean'),
        field: z.string().min(1),
        weight: z.string().min(1),
        as: z.string().min(1),
      }),
      inputFields: operation => [operation.field, operation.weight],
      outputFields: operation => [operation.as],
      reduce: (rows, operation) => {
        const weighted = rows.reduce(
          (sum, row) => sum + Number(row[operation.field]) * Number(row[operation.weight]),
          0,
        );
        const weights = rows.reduce((sum, row) => sum + Number(row[operation.weight]), 0);
        return { [operation.as]: weighted / weights };
      },
    });

    const out = applyTransforms(
      [
        { group: 'A', value: 10, weight: 1 },
        { group: 'A', value: 20, weight: 3 },
      ],
      [
        {
          kind: 'summarize',
          groupBy: ['group'],
          metrics: [{ kind: 'weighted-mean', field: 'value', weight: 'weight', as: 'weightedValue' }],
        },
      ],
      undefined,
      { ...DEFAULT_TRANSFORM_CONTEXT, statisticsReducerRegistry: resolveStatisticsReducerRegistry([weightedMean]) },
    );

    expect(out).toEqual([expect.objectContaining({ group: 'A', weightedValue: 17.5 })]);
  });

  it('custom_row_selector_in_select', () => {
    const nearest = defineRowSelector({
      schema: z.object({
        kind: z.literal('nearest'),
        field: z.string().min(1),
        target: z.number(),
      }),
      inputFields: operation => [operation.field],
      select: (rows, operation) => {
        const ranked = [...rows].sort(
          (left, right) =>
            Math.abs(Number(left[operation.field]) - operation.target) -
            Math.abs(Number(right[operation.field]) - operation.target),
        );
        return ranked.length === 0 ? [] : [{ row: ranked[0], rank: 1 }];
      },
    });

    const out = applyTransforms(
      [
        { group: 'A', value: 2 },
        { group: 'A', value: 9 },
        { group: 'A', value: 14 },
      ],
      [
        {
          kind: 'select',
          groupBy: ['group'],
          selector: { kind: 'nearest', field: 'value', target: 10 },
          rankAs: 'rank',
        },
      ],
      undefined,
      { ...DEFAULT_TRANSFORM_CONTEXT, rowSelectorRegistry: resolveRowSelectorRegistry([nearest]) },
    );

    expect(out).toEqual([expect.objectContaining({ group: 'A', value: 9, rank: 1 })]);
  });
});
