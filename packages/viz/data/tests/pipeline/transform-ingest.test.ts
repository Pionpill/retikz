import { expect, it } from 'vitest';

import { applyTransformsToDataView, ingestDataTransformResult, resolveDataTransforms } from '../../src';

it('retains complete empty output models and does not reinterpret canonical temporal values', () => {
  const model = [{ name: 'when', type: 'temporal' as const }];
  const resolution = resolveDataTransforms([], model);
  const empty = ingestDataTransformResult(resolution, { rows: [], model });
  expect(empty.fieldTypes.get('when')).toBe('temporal');
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

it('preserves group type evidence while leaving non-scalar extent untyped', () => {
  const resolution = resolveDataTransforms(
    [
      {
        operation: {
          kind: 'summarize',
          groupBy: ['group'],
          metrics: [{ kind: 'extent', field: 'value', as: 'range' }],
        },
      },
    ],
    [
      { name: 'group', type: 'categorical', order: ['B', 'A'] },
      { name: 'value', type: 'continuous' },
    ],
  );
  expect(resolution.stages[0].outputModel).toEqual([
    { name: 'group', type: 'categorical', order: ['B', 'A'] },
    { name: 'range' },
  ]);
  const view = ingestDataTransformResult(resolution, {
    rows: [{ group: 'A', range: [1, 4], payload: 'raw' }],
    model: resolution.stages[0].outputModel,
  });
  expect([...view.fieldTypes]).toEqual([['group', 'categorical']]);
  expect(view.fieldTypeEvidence.has('payload')).toBe(false);
  expect(view.model).toEqual(resolution.stages[0].outputModel);
  const sorted = applyTransformsToDataView(view, [{ kind: 'sort', field: 'group' }]);
  expect(sorted.model).toEqual(resolution.stages[0].outputModel);
  expect(() => applyTransformsToDataView(view, [{ kind: 'sort', field: 'payload' }])).toThrow(/missing input field/);
});

it('retains unknown field existence across empty transformed scopes', () => {
  const model = [{ name: 'value', type: 'continuous' as const }];
  const input = ingestDataTransformResult(resolveDataTransforms([], model), { rows: [], model });
  const root = applyTransformsToDataView(input, [
    { kind: 'summarize', groupBy: ['value'], metrics: [{ kind: 'extent', field: 'value', as: 'range' }] },
  ]);
  const mark = applyTransformsToDataView(root, [{ kind: 'sort', field: 'range' }]);
  expect(mark.rows).toEqual([]);
  expect(mark.fieldTypeEvidence.has('range')).toBe(false);
  expect(mark.model).toEqual([{ name: 'value', type: 'continuous' }, { name: 'range' }]);
});

it('derives type projections from the authoritative model without retaining mutable copies', () => {
  const model = [{ name: 'value', type: 'continuous' as const }];
  const view = ingestDataTransformResult(resolveDataTransforms([], model), { rows: [], model });
  view.fieldTypes.set('fake', 'categorical');
  view.fieldTypes.delete('value');
  expect([...view.fieldTypes]).toEqual([['value', 'continuous']]);
  expect([...view.fieldTypeEvidence]).toEqual(['value']);
  expect(view.model).toEqual(model);
});
