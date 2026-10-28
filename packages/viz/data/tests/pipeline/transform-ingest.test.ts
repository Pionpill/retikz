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

it('将无类型字段保留在空模型中，而不分配回退类型', () => {
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

it('保留完整的空输出模型，并且不重新解释规范时间值', () => {
  const model = [{ name: 'when', type: 'temporal' as const }];
  const resolution = resolveDataTransforms([], model);
  const empty = ingestDataTransformResult(resolution, { rows: [], model });

  expect(empty.model.find(field => field.name === 'when')?.type).toBe('temporal');

  const rows = [{ when: 1700000000000 }];

  expect(ingestDataTransformResult(resolution, { rows, model }).rows).toBe(rows);
});

it('拒绝模型和规范值漂移，无需强制', () => {
  const model = [{ name: 'value', type: 'continuous' as const }];
  const resolution = resolveDataTransforms([], model);

  expect(() =>
    ingestDataTransformResult(resolution, { rows: [], model: [{ name: 'value', type: 'categorical' }] }),
  ).toThrow(/model/);
  expect(() => ingestDataTransformResult(resolution, { rows: [{ value: '2' }], model })).toThrow(/value/);
  expect(() => ingestDataTransformResult(resolution, { rows: [], model: [] })).toThrow(/model/);
});

it('保留组类型证据，同时保留自定义非标量输出无类型', () => {
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

it('在空的转换范围内保留未知字段的存在', () => {
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

it('通过分组摘要和下游排序保持两个范围端点的连续', () => {
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

it.each(['sort', 'bin'] as const)('计算前预检缺少 %s 组字段', kind => {
  expect(() =>
    resolveDataTransforms(
      [{ operation: { kind, params: { field: 'value', groupBy: ['missing'] } } }],
      [{ name: 'value', type: 'continuous' }],
    ),
  ).toThrow(/missing input field/);
});
it('拒绝执行前与组键冲突的自定义 bin 指标输出', () => {
  const metric = defineStatisticsReducer({
    schema: strictObject({ kind: literal('group-output') }),
    outputs: () => [{ field: 'group', type: 'categorical' }],
  });
  expect(() =>
    resolveDataTransforms(
      [
        {
          operation: {
            kind: 'bin',
            params: { field: 'value', groupBy: ['group'], metrics: [{ kind: 'group-output' }] },
          },
        },
      ],
      [
        { name: 'group', type: 'categorical' },
        { name: 'value', type: 'continuous' },
      ],
      { statisticsReducerRegistry: resolveStatisticsReducerRegistry([metric]) },
    ),
  ).toThrow(/groupBy/);
});
