import { expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import type { IRDataTransform } from '../../src';
import {
  applyTransformsToDataView,
  createDataView,
  defineStatisticsReducer,
  defineStatisticsReducerImplementation,
  ingestDataTransformResult,
  resolveDataTransforms,
  resolveStatisticsReducerRegistry,
} from '../../src';

const valuesReducer = defineStatisticsReducer({
  schema: strictObject({ kind: literal('custom-values'), field: string(), as: string() }),
  inputFields: operation => [operation.field],
  outputs: operation => [{ field: operation.as }],
});
const valuesImplementation = defineStatisticsReducerImplementation({
  definition: valuesReducer,
  reduce: (rows, operation) => ({ [operation.as]: rows.map(row => row[operation.field]) }),
});
const valuesContext = { statisticsReducerRegistry: resolveStatisticsReducerRegistry([valuesReducer]) };
const valuesOptions = { context: valuesContext, statisticsReducerImplementations: [valuesImplementation] };

it('keeps untyped fields in empty models without assigning fallback types', () => {
  const view = createDataView(
    [],
    [{ name: 'amount' }, { name: 'region', type: 'categorical' }, { name: 'when', type: 'temporal' }],
  );

  expect(view.model).toEqual([
    { name: 'amount' },
    { name: 'region', type: 'categorical' },
    { name: 'when', type: 'temporal' },
  ]);
});

it('retains complete empty output models and does not reinterpret canonical temporal values', () => {
  const model = [{ name: 'when', type: 'temporal' as const }];
  const resolution = resolveDataTransforms([], model);
  const empty = ingestDataTransformResult(resolution, { rows: [], model });

  expect(empty.model.find(field => field.name === 'when')?.type).toBe('temporal');

  const rows = [{ when: 1700000000000 }];

  expect(ingestDataTransformResult(resolution, { rows, model }).rows).toBe(rows);
});

it('rejects model and canonical value drift without coercion', () => {
  const model = [{ name: 'value', type: 'continuous' as const }];
  const resolution = resolveDataTransforms([], model);

  expect(() =>
    ingestDataTransformResult(resolution, { rows: [], model: [{ name: 'value', type: 'categorical' }] }),
  ).toThrow(/model/);
  expect(() => ingestDataTransformResult(resolution, { rows: [{ value: '2' }], model })).toThrow(/value/);
  expect(() => ingestDataTransformResult(resolution, { rows: [], model: [] })).toThrow(/model/);
});

it('preserves group type evidence while leaving custom non-scalar output untyped', () => {
  const resolution = resolveDataTransforms(
    [
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['group'],
            metrics: [{ kind: 'custom-values', field: 'value', as: 'range' }],
          },
        },
      },
    ],
    [
      { name: 'group', type: 'categorical', order: ['B', 'A'] },
      { name: 'value', type: 'continuous' },
    ],
    valuesContext,
  );

  expect(resolution.stages[0].outputModel).toEqual([
    { name: 'group', type: 'categorical', order: ['B', 'A'] },
    { name: 'range' },
  ]);

  const view = ingestDataTransformResult(resolution, {
    rows: [{ group: 'A', range: [1, 4], payload: 'raw' }],
    model: resolution.stages[0].outputModel,
  });

  expect(view.model.find(field => field.name === 'payload')).toBeUndefined();
  expect(view.model).toEqual(resolution.stages[0].outputModel);

  const sorted = applyTransformsToDataView(view, [{ kind: 'sort', params: { field: 'group' } }]).dataView;

  expect(sorted.model).toEqual(resolution.stages[0].outputModel);
  expect(() => applyTransformsToDataView(view, [{ kind: 'sort', params: { field: 'payload' } }]).dataView).toThrow(
    /missing input field/,
  );
});

it('retains unknown field existence across empty transformed scopes', () => {
  const model = [{ name: 'value', type: 'continuous' as const }];
  const input = ingestDataTransformResult(resolveDataTransforms([], model), { rows: [], model });
  const root = applyTransformsToDataView(
    input,
    [
      {
        kind: 'summarize',
        params: { groupBy: ['value'], metrics: [{ kind: 'custom-values', field: 'value', as: 'range' }] },
      },
    ],
    valuesOptions,
  ).dataView;
  const mark = applyTransformsToDataView(root, [{ kind: 'sort', params: { field: 'range' } }]).dataView;

  expect(mark.rows).toEqual([]);
  expect(mark.model.find(field => field.name === 'range')).toEqual({ name: 'range' });
  expect(mark.model).toEqual([{ name: 'value', type: 'continuous' }, { name: 'range' }]);
});

it('keeps both extent endpoints continuous through grouped summaries and downstream sorting', () => {
  const model = [
    { name: 'group', type: 'categorical' as const, order: ['B', 'A'] },
    { name: 'value', type: 'continuous' as const },
  ];
  const input = createDataView(
    [
      { group: 'A', value: 4 },
      { group: 'B', value: 2 },
      { group: 'A', value: 1 },
    ],
    model,
  );
  const operation = {
    kind: 'summarize',
    params: { groupBy: ['group'], metrics: [{ kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } }] },
  } satisfies IRDataTransform;
  const expectedModel = [
    { name: 'group', type: 'categorical', order: ['B', 'A'] },
    { name: 'low', type: 'continuous' },
    { name: 'high', type: 'continuous' },
  ];
  const view = applyTransformsToDataView(input, [operation]).dataView;
  expect(view.model).toEqual(expectedModel);
  expect(view.rows).toEqual([
    { group: 'A', low: 1, high: 4 },
    { group: 'B', low: 2, high: 2 },
  ]);
  const sorted = applyTransformsToDataView(view, [{ kind: 'sort', params: { field: 'high' } }]).dataView;
  expect(sorted.rows).toEqual([
    { group: 'B', low: 2, high: 2 },
    { group: 'A', low: 1, high: 4 },
  ]);

  const empty = applyTransformsToDataView(createDataView([], model), [operation]).dataView;
  expect(empty.rows).toEqual([]);
  expect(empty.model).toEqual(expectedModel);

  const resolution = resolveDataTransforms([{ operation }], model);
  expect(() =>
    ingestDataTransformResult(resolution, { rows: [{ group: 'A', low: [1, 4], high: 4 }], model: view.model }),
  ).toThrow(/value/);
});
