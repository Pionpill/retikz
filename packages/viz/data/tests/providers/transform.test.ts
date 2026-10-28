import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { literal, number, object, strictObject } from 'zod';

import type { ExternalRow } from '../../src';
import {
  defineTransformImplementation,
  defineStatisticsReducerImplementation,
  resolveStatisticsReducerImplementationRegistry,
  applyTransforms,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
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

describe('数据转换运行时', () => {
  it('通过共享注册表发布封闭的转换计划', () => {
    expect(resolveTransformRegistry().get('sort')?.schedule).toEqual({
      phase: DataTransformPhase.RowOrder,
      bindingClass: DataTransformBindingClass.Order,
      fieldEffect: DataTransformFieldEffect.Reorder,
    });

    const custom = defineTransform({
      kind: 'custom-derive',
      paramsSchema: strictObject({}),
      schedule: {
        phase: DataTransformPhase.FieldDerive,
        bindingClass: DataTransformBindingClass.Field,
        fieldEffect: DataTransformFieldEffect.Preserve,
      },
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(resolveTransformRegistry([custom]).get('custom-derive')?.schedule).toEqual(custom.schedule);
  });

  it('通过默认的数据注册表执行稳定的排序和累积间隔', () => {
    const sorted = applyTransforms([{ m: 3 }, { m: 1 }, { m: 2 }], [{ kind: 'sort', params: { field: 'm' } }]).rows;

    expect(sorted.map(row => row.m)).toEqual([1, 2, 3]);

    const stacked = applyTransforms(SALES, [
      { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } },
    ]).rows;

    expect(stacked.map(row => [row.y0, row.y1])).toEqual([
      [0, 3],
      [3, 8],
      [0, 2],
      [2, 6],
    ]);
  });

  it('通过同一注册表执行自定义转换', () => {
    const doubleRevenue = defineTransform({
      kind: 'double-revenue',
      paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
      inputFields: operation => [operation.params.field],
      outputModel: operation => ({
        kind: 'preserve',
        outputs: [{ field: operation.params.as }],
      }),
    });
    const doubleRevenueImplementation = defineTransformImplementation({
      definition: doubleRevenue,
      apply: (rows, operation) =>
        rows.map(row => ({ ...row, [operation.params.as]: Number(row[operation.params.field]) * 2 })),
    });

    const out = applyTransforms(
      [{ revenue: 3 }],
      [{ kind: 'double-revenue', params: { field: 'revenue', as: 'doubleRevenue' } }],
      {
        registry: resolveTransformRegistry([doubleRevenue]),
        transformImplementations: [doubleRevenueImplementation],
      },
    ).rows;

    expect(out).toEqual([{ revenue: 3, doubleRevenue: 6 }]);
  });

  it('未知和重复的转换注册失败', () => {
    const custom = defineTransform({
      kind: 'custom',
      paramsSchema: object({ value: number() }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(() => applyTransforms([{ value: 1 }], [{ kind: 'missing', params: { value: 1 } }]).rows).toThrow(
      /not registered/,
    );
    expect(() => resolveTransformRegistry([custom, custom])).toThrow(/duplicate transform registration/);
  });

  it('通过汇总保留组来源追溯', () => {
    const out = applyTransforms(tagSourceIndex(SALES), [
      {
        kind: 'summarize',
        params: {
          groupBy: ['month'],
          metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
        },
      },
    ]).rows;

    expect(readSourceIndices(out[0])).toEqual([0, 1]);
    expect(readSourceIndices(out[1])).toEqual([2, 3]);
  });

  it('跨组重用已解析的归约器参数并重新解析新请求', () => {
    let parses = 0;
    const reducer = defineStatisticsReducer({
      schema: strictObject({
        kind: literal('prepared-count'),
        as: NonBlankStringSchema,
        factor: number()
          .default(2)
          .transform(value => {
            parses += 1;
            return value + 1;
          }),
      }),
      outputs: operation => [{ field: operation.as }],
    });
    const implementation = defineStatisticsReducerImplementation({
      definition: reducer,
      reduce: (rows, operation) => ({ [operation.as]: rows.length * operation.factor }),
    });
    const registry = resolveStatisticsReducerRegistry([reducer]);
    const run = (rows: Array<ExternalRow>) =>
      applyTransforms(
        rows,
        [
          {
            kind: 'summarize',
            params: { groupBy: ['month'], metrics: [{ kind: 'prepared-count', as: 'count' }] },
          },
        ],
        {
          context: {
            ...DEFAULT_TRANSFORM_CONTEXT,
            statisticsReducerRegistry: registry,
            statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(registry, [
              implementation,
            ]),
          },
        },
      ).rows;
    expect(run(SALES.slice(0, 2))).toEqual([{ month: 'Jan', count: 6 }]);
    const firstRequestParses = parses;
    parses = 0;
    expect(run(SALES)).toEqual([
      { month: 'Jan', count: 6 },
      { month: 'Feb', count: 6 },
    ]);
    expect(parses).toBe(firstRequestParses);
    expect(parses).toBeGreaterThan(0);
  });

  it('使用来自转换上下文的自定义统计缩减器注册表', () => {
    const range = defineStatisticsReducer({
      schema: object({
        kind: literal('range'),
        field: NonBlankStringSchema,
        as: NonBlankStringSchema,
      }),
      inputFields: operation => [operation.field],
      outputs: operation => [{ field: operation.as }],
    });
    const rangeImplementation = defineStatisticsReducerImplementation({
      definition: range,
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
          params: {
            groupBy: ['month'],
            metrics: [{ kind: 'range', field: 'revenue', as: 'revenueRange' }],
          },
        },
      ],
      {
        context: {
          ...DEFAULT_TRANSFORM_CONTEXT,
          statisticsReducerRegistry: resolveStatisticsReducerRegistry([range]),
          statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
            resolveStatisticsReducerRegistry([range]),
            [rangeImplementation],
          ),
        },
      },
    ).rows;

    expect(out).toEqual([
      expect.objectContaining({ month: 'Jan', revenueRange: 2 }),
      expect.objectContaining({ month: 'Feb', revenueRange: 2 }),
    ]);
  });

  it('拒绝与组或归约器字段发生冲突的自定义归约器输出', () => {
    let groupWriterCalls = 0;
    let firstStatCalls = 0;
    let secondStatCalls = 0;
    const groupWriter = defineStatisticsReducer({
      schema: strictObject({ kind: literal('group-writer') }),
      outputs: () => ['group'].map(field => ({ field })),
    });
    const groupWriterImplementation = defineStatisticsReducerImplementation({
      definition: groupWriter,
      reduce: () => {
        groupWriterCalls += 1;
        return { group: 2 };
      },
    });
    const firstStat = defineStatisticsReducer({
      schema: strictObject({ kind: literal('first-stat') }),
      outputs: () => ['stat'].map(field => ({ field })),
    });
    const firstStatImplementation = defineStatisticsReducerImplementation({
      definition: firstStat,
      reduce: () => {
        firstStatCalls += 1;
        return { stat: 1 };
      },
    });
    const secondStat = defineStatisticsReducer({
      schema: strictObject({ kind: literal('second-stat') }),
      outputs: () => ['stat'].map(field => ({ field })),
    });
    const secondStatImplementation = defineStatisticsReducerImplementation({
      definition: secondStat,
      reduce: () => {
        secondStatCalls += 1;
        return { stat: 2 };
      },
    });

    expect(
      () =>
        applyTransforms(
          [{ group: 'A', value: 1 }],
          [{ kind: 'summarize', params: { groupBy: ['group'], metrics: [{ kind: 'group-writer' }] } }],
          {
            context: {
              ...DEFAULT_TRANSFORM_CONTEXT,
              statisticsReducerRegistry: resolveStatisticsReducerRegistry([groupWriter]),
              statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
                resolveStatisticsReducerRegistry([groupWriter]),
                [groupWriterImplementation],
              ),
            },
          },
        ).rows,
    ).toThrow('data: reducer output field "group" must not collide with a groupBy field');
    expect(groupWriterCalls).toBe(0);

    expect(
      () =>
        applyTransforms(
          [{ value: 1 }],
          [{ kind: 'summarize', params: { metrics: [{ kind: 'first-stat' }, { kind: 'second-stat' }] } }],
          {
            context: {
              ...DEFAULT_TRANSFORM_CONTEXT,
              statisticsReducerRegistry: resolveStatisticsReducerRegistry([firstStat, secondStat]),
              statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
                resolveStatisticsReducerRegistry([firstStat, secondStat]),
                [firstStatImplementation, secondStatImplementation],
              ),
            },
          },
        ).rows,
    ).toThrow('data: duplicate reducer output field "stat"');
    expect(firstStatCalls).toBe(0);
    expect(secondStatCalls).toBe(0);
  });

  it('拒绝与注释选择器字段冲突的自定义归约器输出', () => {
    let statWriterCalls = 0;
    const statWriter = defineStatisticsReducer({
      schema: strictObject({ kind: literal('stat-writer') }),
      outputs: () => ['stat'].map(field => ({ field })),
    });
    const statWriterImplementation = defineStatisticsReducerImplementation({
      definition: statWriter,
      reduce: () => {
        statWriterCalls += 1;
        return { stat: 1 };
      },
    });

    expect(
      () =>
        applyTransforms(
          [{ value: 1 }],
          [
            {
              kind: 'annotate',
              params: {
                metrics: [{ kind: 'stat-writer' }],
                selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'stat' }],
              },
            },
          ],
          {
            context: {
              ...DEFAULT_TRANSFORM_CONTEXT,
              statisticsReducerRegistry: resolveStatisticsReducerRegistry([statWriter]),
              statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
                resolveStatisticsReducerRegistry([statWriter]),
                [statWriterImplementation],
              ),
            },
          },
        ).rows,
    ).toThrow('data: reducer output field "stat" must not collide with an annotate selector output field');
    expect(statWriterCalls).toBe(0);
  });

  it('允许使用不同的字段自定义注释缩减器和选择器输出', () => {
    const meanWriter = defineStatisticsReducer({
      schema: strictObject({ kind: literal('mean-writer') }),
      outputs: () => ['mean'].map(field => ({ field })),
    });
    const meanWriterImplementation = defineStatisticsReducerImplementation({
      definition: meanWriter,
      reduce: rows => ({ mean: rows.reduce((sum, row) => sum + Number(row.value), 0) / rows.length }),
    });

    expect(
      applyTransforms(
        [{ value: 1 }, { value: 2 }],
        [
          {
            kind: 'annotate',
            params: {
              metrics: [{ kind: 'mean-writer' }],
              selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'peak' }],
            },
          },
        ],
        {
          context: {
            ...DEFAULT_TRANSFORM_CONTEXT,
            statisticsReducerRegistry: resolveStatisticsReducerRegistry([meanWriter]),
            statisticsReducerImplementationRegistry: resolveStatisticsReducerImplementationRegistry(
              resolveStatisticsReducerRegistry([meanWriter]),
              [meanWriterImplementation],
            ),
          },
        },
      ).rows,
    ).toEqual([
      { value: 1, mean: 1.5, peak: 2 },
      { value: 2, mean: 1.5, peak: 2 },
    ]);
  });

  it('在顶部和底部选择器中使用最后一个阈值行', () => {
    const rows: Array<ExternalRow> = [
      { id: 'A', score: 10 },
      { id: 'B', score: 9 },
      { id: 'C', score: 9 },
      { id: 'D', score: 8 },
    ];

    expect(
      applyTransforms(rows, [{ kind: 'select', params: { selector: { kind: 'top', by: 'score', n: 2 } } }]).rows.map(
        row => row.id,
      ),
    ).toEqual(['A', 'B']);
    expect(
      applyTransforms(rows, [
        { kind: 'select', params: { selector: { kind: 'top', by: 'score', n: 2, tie: 'last' } } },
      ]).rows.map(row => row.id),
    ).toEqual(['A', 'C']);
    expect(
      applyTransforms(rows, [
        { kind: 'select', params: { selector: { kind: 'top', by: 'score', n: 2, tie: 'all' } } },
      ]).rows.map(row => row.id),
    ).toEqual(['A', 'B', 'C']);

    const bottomRows: Array<ExternalRow> = [
      { id: 'A', score: 1 },
      { id: 'B', score: 2 },
      { id: 'C', score: 2 },
      { id: 'D', score: 3 },
    ];

    expect(
      applyTransforms(bottomRows, [
        { kind: 'select', params: { selector: { kind: 'bottom', by: 'score', n: 2 } } },
      ]).rows.map(row => row.id),
    ).toEqual(['A', 'B']);
    expect(
      applyTransforms(bottomRows, [
        { kind: 'select', params: { selector: { kind: 'bottom', by: 'score', n: 2, tie: 'last' } } },
      ]).rows.map(row => row.id),
    ).toEqual(['A', 'C']);
    expect(
      applyTransforms(bottomRows, [
        { kind: 'select', params: { selector: { kind: 'bottom', by: 'score', n: 2, tie: 'all' } } },
      ]).rows.map(row => row.id),
    ).toEqual(['A', 'B', 'C']);
  });

  it('将升序和降序选择器的缺失顺序值保留在最后', () => {
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
          params: {
            selector: { kind: 'first', orderBy: [{ field: 'value', order: 'descending' }] },
          },
        },
      ]).rows[0]?.id,
    ).toBe('two');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          params: {
            selector: { kind: 'nth', orderBy: [{ field: 'value', order: 'descending' }], index: 1 },
          },
        },
      ]).rows[0]?.id,
    ).toBe('one');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          params: {
            selector: { kind: 'last', orderBy: [{ field: 'value', order: 'descending' }] },
          },
        },
      ]).rows[0]?.id,
    ).toBe('missing-null');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          params: {
            selector: { kind: 'first', orderBy: [{ field: 'value', order: 'ascending' }] },
          },
        },
      ]).rows[0]?.id,
    ).toBe('one');
    expect(
      applyTransforms(rows, [
        {
          kind: 'select',
          params: {
            selector: { kind: 'last', orderBy: [{ field: 'value', order: 'ascending' }] },
          },
        },
      ]).rows[0]?.id,
    ).toBe('missing-null');
  });

  it('将缺失和非有限排序值保留在两个方向上的最后', () => {
    const rows: Array<ExternalRow> = [
      { id: 'missing-undefined' },
      { id: 'two', value: 2 },
      { id: 'invalid-nan', value: Number.NaN },
      { id: 'one', value: 1 },
      { id: 'missing-null', value: null },
    ];

    expect(applyTransforms(rows, [{ kind: 'sort', params: { field: 'value' } }]).rows.map(row => row.id)).toEqual([
      'one',
      'two',
      'missing-undefined',
      'invalid-nan',
      'missing-null',
    ]);
    expect(
      applyTransforms(rows, [{ kind: 'sort', params: { field: 'value', order: 'descending' } }]).rows.map(
        row => row.id,
      ),
    ).toEqual(['two', 'one', 'missing-undefined', 'invalid-nan', 'missing-null']);
  });
});
