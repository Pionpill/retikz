import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { DataLineageEvent, ExternalRow } from '../../src';

import {
  applyTransforms,
  applyTransformsWithLineage,
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
  { month: 'Feb', product: 'C', revenue: 6 },
];

const eventsOf = <TKind extends DataLineageEvent['kind']>(
  events: Array<DataLineageEvent>,
  kind: TKind,
): Array<Extract<DataLineageEvent, { kind: TKind }>> =>
  events.filter((event): event is Extract<DataLineageEvent, { kind: TKind }> => event.kind === kind);

describe('data lineage runtime', () => {
  it('keeps applyTransforms lineage-free and records capped source plus steps only by default', () => {
    const plain = applyTransforms(tagSourceIndex(SALES), [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(readSourceIndices(plain[0])).toEqual([0, 1]);

    const { rows, lineage } = applyTransformsWithLineage(SALES, [
      {
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    ]);

    expect(rows).toEqual([
      expect.objectContaining({ month: 'Jan', totalRevenue: 8 }),
      expect.objectContaining({ month: 'Feb', totalRevenue: 12 }),
    ]);
    expect(eventsOf(lineage.events, 'source')).toHaveLength(1);
    expect(eventsOf(lineage.events, 'transformStep')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        operationKind: 'summarize',
        inputRowCount: 5,
        outputRowCount: 2,
        inputFields: ['month', 'revenue'],
        outputFields: ['totalRevenue'],
        outputSourceIdentity: { mode: 'summary', count: 5, indices: [0, 1, 2, 3, 4], truncated: false },
      }),
    ]);
    expect(eventsOf(lineage.events, 'rowSample')).toHaveLength(0);
    expect(eventsOf(lineage.events, 'reducerOperation')).toHaveLength(0);
  });

  it('records field flow and reducer operations only when their switches are enabled', () => {
    const { lineage } = applyTransformsWithLineage(
      SALES,
      [
        {
          kind: 'annotate',
          groupBy: ['month'],
          metrics: [{ kind: 'mean', field: 'revenue', as: 'averageRevenue' }],
        },
      ],
      { lineage: { fieldFlow: true, reducerOperations: true } },
    );

    expect(eventsOf(lineage.events, 'fieldFlow')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        operationKind: 'annotate',
        inputFields: ['month', 'revenue'],
        outputFields: ['averageRevenue'],
      }),
    ]);
    expect(eventsOf(lineage.events, 'reducerOperation')).toEqual([
      expect.objectContaining({
        operationKind: 'mean',
        inputFields: ['revenue'],
        outputFields: ['averageRevenue'],
        rowCount: 2,
      }),
      expect.objectContaining({
        operationKind: 'mean',
        inputFields: ['revenue'],
        outputFields: ['averageRevenue'],
        rowCount: 3,
      }),
    ]);
    expect(eventsOf(lineage.events, 'selectorOperation')).toHaveLength(0);
  });

  it('keeps selector operations independent from reducer operations', () => {
    const selectorOnly = applyTransformsWithLineage(
      SALES,
      [{ kind: 'select', groupBy: ['month'], selector: { kind: 'top', by: 'revenue', n: 1 } }],
      { lineage: { selectorOperations: true } },
    );

    expect(eventsOf(selectorOnly.lineage.events, 'selectorOperation')).toEqual([
      expect.objectContaining({
        operationKind: 'top',
        operation: { kind: 'top', by: 'revenue', n: 1 },
        inputFields: ['revenue'],
        selectedSourceIdentity: { mode: 'summary', count: 1, indices: [1], truncated: false },
      }),
      expect.objectContaining({
        operationKind: 'top',
        operation: { kind: 'top', by: 'revenue', n: 1 },
        inputFields: ['revenue'],
        selectedSourceIdentity: { mode: 'summary', count: 1, indices: [4], truncated: false },
      }),
    ]);
    expect(eventsOf(selectorOnly.lineage.events, 'reducerOperation')).toHaveLength(0);

    const reducerOnly = applyTransformsWithLineage(
      SALES,
      [
        {
          kind: 'summarize',
          groupBy: ['month'],
          metrics: [{ kind: 'count', as: 'rows' }],
        },
      ],
      { lineage: { reducerOperations: true } },
    );

    expect(eventsOf(reducerOnly.lineage.events, 'reducerOperation')).toHaveLength(2);
    expect(eventsOf(reducerOnly.lineage.events, 'selectorOperation')).toHaveLength(0);
  });

  it('caps row samples and rejects unbounded sample options', () => {
    const { lineage } = applyTransformsWithLineage(SALES, [{ kind: 'sort', field: 'revenue' }], {
      lineage: { rowSamples: { maxRows: 1, fields: ['month', 'revenue'] } },
    });

    expect(eventsOf(lineage.events, 'rowSample')).toEqual([
      expect.objectContaining({
        operationIndex: 0,
        phase: 'input',
        rows: [{ month: 'Jan', revenue: 3 }],
      }),
      expect.objectContaining({
        operationIndex: 0,
        phase: 'output',
        rows: [{ month: 'Feb', revenue: 2 }],
      }),
    ]);

    expect(() =>
      applyTransformsWithLineage(SALES, [{ kind: 'sort', field: 'revenue' }], {
        lineage: { rowSamples: { maxRows: 0, fields: ['month'] } },
      }),
    ).toThrow(/rowSamples.maxRows/);
    expect(() =>
      applyTransformsWithLineage(SALES, [{ kind: 'sort', field: 'revenue' }], {
        lineage: { rowSamples: { maxRows: 1, fields: [] } },
      }),
    ).toThrow(/rowSamples.fields/);
  });

  it('records custom transform steps through the shared registry', () => {
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

    const { rows, lineage } = applyTransformsWithLineage(
      [{ revenue: 3 }],
      [{ kind: 'double-revenue', field: 'revenue', as: 'doubleRevenue' }],
      {
        registry: resolveTransformRegistry([doubleRevenue]),
        lineage: { fieldFlow: true },
      },
    );

    expect(rows).toEqual([expect.objectContaining({ revenue: 3, doubleRevenue: 6 })]);
    expect(eventsOf(lineage.events, 'transformStep')).toEqual([
      expect.objectContaining({
        operationKind: 'double-revenue',
        inputFields: ['revenue'],
        outputFields: ['doubleRevenue'],
      }),
    ]);
    expect(eventsOf(lineage.events, 'fieldFlow')).toHaveLength(1);
  });

  it('records full source identities only when explicitly requested', () => {
    const operations = [
      {
        kind: 'summarize' as const,
        metrics: [{ kind: 'count' as const, as: 'rows' }],
      },
    ];

    const summary = applyTransformsWithLineage(SALES, operations, {
      lineage: { sourceIdentity: { maxIndices: 2 } },
    });
    const full = applyTransformsWithLineage(SALES, operations, {
      lineage: { sourceIdentity: { mode: 'full' } },
    });

    expect(eventsOf(summary.lineage.events, 'transformStep')[0]?.outputSourceIdentity).toEqual({
      mode: 'summary',
      count: 5,
      indices: [0, 1],
      truncated: true,
    });
    expect(eventsOf(full.lineage.events, 'transformStep')[0]?.outputSourceIdentity).toEqual({
      mode: 'full',
      count: 5,
      indices: [0, 1, 2, 3, 4],
      truncated: false,
    });
  });

  it('keeps source identities through chained grouped transforms', () => {
    const { rows, lineage } = applyTransformsWithLineage(
      SALES,
      [
        {
          kind: 'summarize',
          groupBy: ['month'],
          metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
        },
        {
          kind: 'summarize',
          metrics: [{ kind: 'count', as: 'monthCount' }],
        },
      ],
      { lineage: { sourceIdentity: { mode: 'full' } } },
    );

    expect(readSourceIndices(rows[0])).toEqual([0, 1, 2, 3, 4]);
    expect(eventsOf(lineage.events, 'transformStep')[1]?.outputSourceIdentity).toEqual({
      mode: 'full',
      count: 5,
      indices: [0, 1, 2, 3, 4],
      truncated: false,
    });
  });

  it('streams sink events without retaining them unless requested', () => {
    const streamed: Array<DataLineageEvent> = [];

    const { lineage } = applyTransformsWithLineage(SALES, [{ kind: 'sort', field: 'revenue' }], {
      lineage: { sink: event => streamed.push(event) },
    });
    const retained = applyTransformsWithLineage(SALES, [{ kind: 'sort', field: 'revenue' }], {
      lineage: { sink: event => streamed.push(event), retainEvents: true },
    });

    expect(streamed.length).toBeGreaterThan(0);
    expect(lineage.events).toEqual([]);
    expect(retained.lineage.events.length).toBeGreaterThan(0);
  });

  it('uses calculation detail sampling only when explicitly enabled', () => {
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

    const { lineage } = applyTransformsWithLineage(
      SALES,
      [
        {
          kind: 'summarize',
          groupBy: ['month'],
          metrics: [{ kind: 'range', field: 'revenue', as: 'revenueRange' }],
        },
      ],
      {
        context: { statisticsReducerRegistry: resolveStatisticsReducerRegistry([range]) },
        lineage: { reducerOperations: true, calculationDetails: { maxRows: 1, fields: ['product', 'revenue'] } },
      },
    );

    expect(eventsOf(lineage.events, 'reducerOperation')[0]).toEqual(
      expect.objectContaining({
        operationKind: 'range',
        detailRows: [{ product: 'A', revenue: 3 }],
      }),
    );
  });

  it('does not produce successful step events when transform lookup fails', () => {
    expect(() => applyTransformsWithLineage([{ value: 1 }], [{ kind: 'missing', value: 1 }])).toThrow(/not registered/);
  });
});
