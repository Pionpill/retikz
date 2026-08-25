import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { IRDataReducerOperation, IRDataSelectorOperation } from '../../src';

import {
  applyReducerOperation,
  applySelectorOperation,
  DataSortOrder,
  DEFAULT_TRANSFORM_CONTEXT,
  defineRowSelector,
  defineStatisticsReducer,
  reducerInputFields,
  ReducerOperationKind,
  reducerOutputFields,
  resolveRowSelectorRegistry,
  resolveStatisticsReducerRegistry,
  RowSelectorTie,
  selectorInputFields,
  SelectorOperationKind,
} from '../../src';

describe('statistics provider runtime', () => {
  it('computes every scalar reducer from finite field values', () => {
    const rows = [{ value: 1 }, { value: 4 }, { value: 9 }, { value: Number.NaN }, { value: Infinity }, {}];

    expect(
      applyReducerOperation(rows, { kind: ReducerOperationKind.Count, as: 'result' }, DEFAULT_TRANSFORM_CONTEXT),
    ).toEqual({ result: 6 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Sum, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 14 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Mean, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 14 / 3 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Median, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 4 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Min, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 1 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Max, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 9 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Extent, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: [1, 9] });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Quantile, field: 'value', p: 0.25, as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 2.5 });
  });

  it('keeps finite mean and median results stable near the numeric limit', () => {
    const reduce = (
      values: Array<number>,
      kind: typeof ReducerOperationKind.Mean | typeof ReducerOperationKind.Median,
    ) =>
      applyReducerOperation(
        values.map(value => ({ value })),
        { kind, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ).result;

    expect(reduce([1e308, 1e308], ReducerOperationKind.Mean)).toBe(1e308);
    expect(reduce([1e308, -1e308], ReducerOperationKind.Mean)).toBe(0);
    expect(reduce([1e308, 1e308], ReducerOperationKind.Median)).toBe(1e308);
    expect(reduce([-1e308, 1e308], ReducerOperationKind.Median)).toBe(0);
  });

  it('computes large-group extrema without expanding values into call arguments', () => {
    const rows = Array.from({ length: 1_000_000 }, (_, index) => ({ value: index + 1 }));

    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Min, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 1 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Max, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: 1_000_000 });
    expect(
      applyReducerOperation(
        rows,
        { kind: ReducerOperationKind.Extent, field: 'value', as: 'result' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ result: [1, 1_000_000] });
    expect(
      applyReducerOperation(
        rows,
        {
          kind: ReducerOperationKind.QuantileBand,
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          outputs: { lower: 'lower', upper: 'upper', min: 'min', max: 'max' },
        },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toMatchObject({ min: 1, max: 1_000_000 });
  });

  it('keeps count and sum identities but marks undefined empty statistics invalid', () => {
    const identityOperations: Array<IRDataReducerOperation> = [
      { kind: ReducerOperationKind.Count, as: 'result' },
      { kind: ReducerOperationKind.Sum, field: 'value', as: 'result' },
    ];
    const undefinedScalarOperations: Array<IRDataReducerOperation> = [
      { kind: ReducerOperationKind.Mean, field: 'value', as: 'result' },
      { kind: ReducerOperationKind.Median, field: 'value', as: 'result' },
      { kind: ReducerOperationKind.Min, field: 'value', as: 'result' },
      { kind: ReducerOperationKind.Max, field: 'value', as: 'result' },
      { kind: ReducerOperationKind.Quantile, field: 'value', p: 0.5, as: 'result' },
    ];

    for (const operation of identityOperations) {
      expect(applyReducerOperation([], operation, DEFAULT_TRANSFORM_CONTEXT)).toEqual({ result: 0 });
    }
    for (const operation of undefinedScalarOperations) {
      const out = applyReducerOperation([], operation, DEFAULT_TRANSFORM_CONTEXT);
      expect(Number.isNaN(out.result)).toBe(true);
    }

    const extent = applyReducerOperation(
      [],
      { kind: ReducerOperationKind.Extent, field: 'value', as: 'result' },
      DEFAULT_TRANSFORM_CONTEXT,
    ).result;
    expect(Array.isArray(extent)).toBe(true);
    expect((extent as Array<unknown>).every(value => typeof value === 'number' && Number.isNaN(value))).toBe(true);

    const band = applyReducerOperation(
      [],
      {
        kind: ReducerOperationKind.QuantileBand,
        field: 'value',
        lowerP: 0.25,
        upperP: 0.75,
        outputs: {
          lower: 'lower',
          upper: 'upper',
          points: [{ p: 0.5, as: 'median' }],
          spread: 'spread',
          lowerFence: 'lowerFence',
          upperFence: 'upperFence',
          whiskerMin: 'whiskerMin',
          whiskerMax: 'whiskerMax',
          min: 'min',
          max: 'max',
          count: 'count',
        },
        whisker: { kind: 'spread' },
      },
      DEFAULT_TRANSFORM_CONTEXT,
    );
    expect(band.count).toBe(0);
    for (const [field, value] of Object.entries(band)) {
      if (field === 'count') continue;
      expect(Number.isNaN(value)).toBe(true);
    }
  });

  it('computes quantile-band points, spread fences, whiskers and extent metadata', () => {
    const operation = {
      kind: ReducerOperationKind.QuantileBand,
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      outputs: {
        lower: 'lower',
        upper: 'upper',
        points: [{ p: 0.5, as: 'median' }],
        spread: 'spread',
        lowerFence: 'lowerFence',
        upperFence: 'upperFence',
        whiskerMin: 'whiskerMin',
        whiskerMax: 'whiskerMax',
        min: 'min',
        max: 'max',
        count: 'count',
      },
      whisker: { kind: 'spread' as const, factor: 1.5 },
    } as const;

    expect(
      applyReducerOperation(
        [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 100 }],
        operation,
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({
      lower: 1,
      upper: 3,
      median: 2,
      spread: 2,
      lowerFence: -2,
      upperFence: 6,
      whiskerMin: 0,
      whiskerMax: 3,
      min: 0,
      max: 100,
      count: 5,
    });

    expect(
      applyReducerOperation(
        [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 100 }],
        {
          kind: ReducerOperationKind.QuantileBand,
          field: 'value',
          lowerP: 0.25,
          upperP: 0.75,
          outputs: { lower: 'lower', upper: 'upper', whiskerMin: 'whiskerMin', whiskerMax: 'whiskerMax' },
          whisker: { kind: 'minMax' },
        },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual({ lower: 1, upper: 3, whiskerMin: 0, whiskerMax: 100 });
  });

  it('reports reducer input and output fields through the registry contract', () => {
    const quantileBand = {
      kind: ReducerOperationKind.QuantileBand,
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      outputs: { lower: 'q1', upper: 'q3', points: [{ p: 0.5, as: 'median' }], count: 'count' },
    } as const;

    expect(reducerInputFields({ kind: ReducerOperationKind.Count, as: 'rows' })).toEqual([]);
    expect(reducerInputFields(quantileBand)).toEqual(['value']);
    expect(reducerOutputFields(quantileBand)).toEqual(['q1', 'q3', 'median', 'count']);
  });

  it('selects min and max rows with first, last and all tie policies', () => {
    const rows = [
      { id: 'first-min', value: 1 },
      { id: 'last-min', value: 1 },
      { id: 'middle', value: 2 },
      { id: 'max', value: 3 },
      { id: 'invalid', value: Number.NaN },
    ];
    const selectIds = (operation: IRDataSelectorOperation) =>
      applySelectorOperation(rows, operation, DEFAULT_TRANSFORM_CONTEXT).map(selection => selection.row.id);

    expect(selectIds({ kind: SelectorOperationKind.Min, by: 'value' })).toEqual(['first-min']);
    expect(selectIds({ kind: SelectorOperationKind.Min, by: 'value', tie: RowSelectorTie.Last })).toEqual(['last-min']);
    expect(selectIds({ kind: SelectorOperationKind.Min, by: 'value', tie: RowSelectorTie.All })).toEqual([
      'first-min',
      'last-min',
    ]);
    expect(selectIds({ kind: SelectorOperationKind.Max, by: 'value' })).toEqual(['max']);
  });

  it('selects ordered first, last and nth rows with stable one-based ranks', () => {
    const rows = [
      { id: 'b', order: 2 },
      { id: 'a-1', order: 1 },
      { id: 'a-2', order: 1 },
    ];
    const orderBy = [{ field: 'order', order: DataSortOrder.Ascending }];

    expect(
      applySelectorOperation(rows, { kind: SelectorOperationKind.First, orderBy }, DEFAULT_TRANSFORM_CONTEXT),
    ).toEqual([{ row: rows[1], rank: 1 }]);
    expect(
      applySelectorOperation(rows, { kind: SelectorOperationKind.Last, orderBy }, DEFAULT_TRANSFORM_CONTEXT),
    ).toEqual([{ row: rows[0], rank: 1 }]);
    expect(
      applySelectorOperation(rows, { kind: SelectorOperationKind.Nth, orderBy, index: 1 }, DEFAULT_TRANSFORM_CONTEXT),
    ).toEqual([{ row: rows[2], rank: 2 }]);
    expect(
      applySelectorOperation(rows, { kind: SelectorOperationKind.Nth, orderBy, index: 3 }, DEFAULT_TRANSFORM_CONTEXT),
    ).toEqual([]);
  });

  it('extends top and bottom selections according to the boundary tie policy', () => {
    const rows = [
      { id: 'high', value: 3 },
      { id: 'tie-first', value: 2 },
      { id: 'tie-last', value: 2 },
      { id: 'low', value: 1 },
    ];

    expect(
      applySelectorOperation(
        rows,
        { kind: SelectorOperationKind.Top, by: 'value', n: 2, tie: RowSelectorTie.All },
        DEFAULT_TRANSFORM_CONTEXT,
      ).map(selection => selection.row.id),
    ).toEqual(['high', 'tie-first', 'tie-last']);
    expect(
      applySelectorOperation(
        rows,
        { kind: SelectorOperationKind.Bottom, by: 'value', n: 2, tie: RowSelectorTie.Last },
        DEFAULT_TRANSFORM_CONTEXT,
      ).map(selection => selection.row.id),
    ).toEqual(['low', 'tie-last']);
  });

  it('selects rows outside quantile bands and spread fences', () => {
    const rows = [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }, { value: 100 }];
    const selectValues = (operation: IRDataSelectorOperation) =>
      applySelectorOperation(rows, operation, DEFAULT_TRANSFORM_CONTEXT).map(selection => selection.row.value);
    const base = {
      kind: SelectorOperationKind.OutsideQuantileBand,
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
    } as const;

    expect(selectValues(base)).toEqual([0, 100]);
    expect(selectValues({ ...base, boundary: { kind: 'spread', factor: 1.5 } })).toEqual([100]);
  });

  it('returns no selection for empty or non-finite numeric inputs', () => {
    const operations: Array<IRDataSelectorOperation> = [
      { kind: SelectorOperationKind.Min, by: 'value' },
      { kind: SelectorOperationKind.Max, by: 'value' },
      { kind: SelectorOperationKind.First },
      { kind: SelectorOperationKind.Last },
      { kind: SelectorOperationKind.Top, by: 'value', n: 1 },
      { kind: SelectorOperationKind.Bottom, by: 'value', n: 1 },
      { kind: SelectorOperationKind.Nth, orderBy: [{ field: 'value' }], index: 0 },
      {
        kind: SelectorOperationKind.OutsideQuantileBand,
        field: 'value',
        lowerP: 0.25,
        upperP: 0.75,
      },
    ];

    for (const operation of operations) {
      expect(applySelectorOperation([], operation, DEFAULT_TRANSFORM_CONTEXT)).toEqual([]);
    }
    expect(
      applySelectorOperation(
        [{ value: Number.NaN }, { value: Infinity }],
        { kind: SelectorOperationKind.Min, by: 'value' },
        DEFAULT_TRANSFORM_CONTEXT,
      ),
    ).toEqual([]);
  });

  it('reports selector fields and rejects duplicate or unknown registrations', () => {
    expect(
      selectorInputFields({
        kind: SelectorOperationKind.Nth,
        orderBy: [{ field: 'group' }, { field: 'value', order: DataSortOrder.Descending }],
        index: 0,
      }),
    ).toEqual(['group', 'value']);

    const reducer = defineStatisticsReducer({
      schema: strictObject({ kind: literal('custom-total') }),
      reduce: () => ({}),
    });
    const selector = defineRowSelector({
      schema: strictObject({ kind: literal('custom-row') }),
      select: () => [],
    });
    expect(() => resolveStatisticsReducerRegistry([reducer, reducer])).toThrow(
      'data: duplicate statistics reducer registration: "custom-total"',
    );
    expect(() => resolveRowSelectorRegistry([selector, selector])).toThrow(
      'data: duplicate row selector registration: "custom-row"',
    );
    expect(() => reducerInputFields({ kind: 'unknown-reducer' })).toThrow(
      'data: reducer kind "unknown-reducer" is not registered',
    );
    expect(() => selectorInputFields({ kind: 'unknown-selector' })).toThrow(
      'data: selector kind "unknown-selector" is not registered',
    );
  });
});
