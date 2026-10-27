import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  DataScalarReducerOperationSchema,
  ExternalTransformSchema,
  OrderBySchema,
  OutsideQuantileBandBoundarySchema,
  OutsideQuantileBandSelectorOperationSchema,
  QuantileBandOutputsSchema,
  QuantileBandPointOutputSchema,
  QuantileBandReducerOperationSchema,
  QuantileBandWhiskerSchema,
  ReducerOperationSchema,
  SelectorOperationSchema,
  SelectTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from '../../src';
import { BUILTIN_REDUCER_OPERATION_SCHEMAS } from '../../src/operators/reducer';

const closedObjectSchemaCases: Array<{
  name: string;
  schema: ZodType;
  value: Record<string, unknown>;
}> = [
  { name: 'order-by', schema: OrderBySchema, value: { field: 'month', order: 'ascending' } },
  {
    name: 'extent reducer',
    schema: BUILTIN_REDUCER_OPERATION_SCHEMAS.Extent,
    value: { kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } },
  },
  { name: 'quantile point', schema: QuantileBandPointOutputSchema, value: { p: 0.5, as: 'median' } },
  { name: 'min/max whisker', schema: QuantileBandWhiskerSchema, value: { kind: 'minMax' } },
  { name: 'spread whisker', schema: QuantileBandWhiskerSchema, value: { kind: 'spread', factor: 1.5 } },
  {
    name: 'quantile outputs',
    schema: QuantileBandOutputsSchema,
    value: { lower: 'q1', upper: 'q3', points: [{ p: 0.5, as: 'median' }] },
  },
  {
    name: 'quantile reducer',
    schema: QuantileBandReducerOperationSchema,
    value: {
      kind: 'quantile-band',
      field: 'value',
      lowerP: 0.25,
      upperP: 0.75,
      outputs: { lower: 'q1', upper: 'q3' },
    },
  },
  { name: 'band boundary', schema: OutsideQuantileBandBoundarySchema, value: { kind: 'band' } },
  {
    name: 'spread boundary',
    schema: OutsideQuantileBandBoundarySchema,
    value: { kind: 'spread', factor: 1.5 },
  },
  {
    name: 'outside-band selector',
    schema: OutsideQuantileBandSelectorOperationSchema,
    value: { kind: 'outside-quantile-band', field: 'value', lowerP: 0.25, upperP: 0.75 },
  },
  {
    name: 'summarize transform',
    schema: SummarizeTransformSchema,
    value: { kind: 'summarize', params: { groupBy: ['month'], metrics: [{ kind: 'count', as: 'rows' }] } },
  },
  {
    name: 'select transform',
    schema: SelectTransformSchema,
    value: { kind: 'select', params: { groupBy: ['month'], selector: { kind: 'min', by: 'value' } } },
  },
  {
    name: 'annotate selector',
    schema: AnnotateSelectorSchema,
    value: { selector: { kind: 'max', by: 'value' }, as: 'isMax' },
  },
  {
    name: 'annotate transform',
    schema: AnnotateTransformSchema,
    value: {
      kind: 'annotate',
      params: {
        groupBy: ['month'],
        selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'isMax' }],
      },
    },
  },
];

describe('转换 schema', () => {
  it('解析变换操作并保持 JSON 往返等价', () => {
    const operation = TransformSchema.parse({ kind: 'sort', params: { field: 'month', order: 'ascending' } });

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('拒绝 schema 边界处无效的内置变换形状', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: { field: '' } })).toThrow();
    expect(ReducerOperationSchema.safeParse({ kind: 'sum' }).success).toBe(false);
    expect(SelectorOperationSchema.safeParse({ kind: 'min' }).success).toBe(false);
  });

  it('接受标量归约器候选，同时排除多输出内置', () => {
    expect(DataScalarReducerOperationSchema.parse({ kind: 'custom.scalar', field: 'value', as: 'metric' })).toEqual({
      kind: 'custom.scalar',
      field: 'value',
      as: 'metric',
    });
    expect(DataScalarReducerOperationSchema.safeParse({ kind: 'mean' }).success).toBe(false);
    expect(
      DataScalarReducerOperationSchema.safeParse({ kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } })
        .success,
    ).toBe(false);
  });

  it.each([
    'range',
    { min: 'low' },
    { max: 'high' },
    { min: '', max: 'high' },
    { min: 'low', max: ' ' },
    { min: 'same', max: 'same' },
    { min: 'low', max: 'high', extra: true },
  ])('拒绝无效范围输出映射：%j', as => {
    expect(BUILTIN_REDUCER_OPERATION_SCHEMAS.Extent.safeParse({ kind: 'extent', field: 'value', as }).success).toBe(
      false,
    );
  });

  it('报告其声明路径上的范围端点冲突', () => {
    const duplicateEndpoint = BUILTIN_REDUCER_OPERATION_SCHEMAS.Extent.safeParse({
      kind: 'extent',
      field: 'value',
      as: { min: 'same', max: 'same' },
    });
    expect(duplicateEndpoint.success).toBe(false);
    if (!duplicateEndpoint.success) expect(duplicateEndpoint.error.issues[0].path).toEqual(['as', 'max']);

    const cases = [
      {
        operation: {
          kind: 'summarize',
          params: {
            groupBy: ['group'],
            metrics: [{ kind: 'extent', field: 'value', as: { min: 'group', max: 'high' } }],
          },
        },
        path: ['params', 'metrics', 0, 'as', 'min'],
      },
      {
        operation: {
          kind: 'summarize',
          params: {
            metrics: [
              { kind: 'count', as: 'high' },
              { kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } },
            ],
          },
        },
        path: ['params', 'metrics', 1, 'as', 'max'],
      },
      {
        operation: {
          kind: 'annotate',
          params: {
            metrics: [{ kind: 'extent', field: 'value', as: { min: 'low', max: 'high' } }],
            selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'high' }],
          },
        },
        path: ['params', 'selectors', 0, 'as'],
      },
    ];
    for (const { operation, path } of cases) {
      expect(TransformSchema.safeParse(operation).success).toBe(false);
      const schema = operation.kind === 'summarize' ? SummarizeTransformSchema : AnnotateTransformSchema;
      const result = schema.safeParse(operation);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues).toContainEqual(expect.objectContaining({ path }));
    }
  });

  it('拒绝在一次操作中发生冲突的变换输出字段', () => {
    expect(
      TransformSchema.safeParse({
        kind: 'summarize',
        params: {
          groupBy: ['group'],
          metrics: [{ kind: 'count', as: 'group' }],
        },
      }).success,
    ).toBe(false);
    expect(
      TransformSchema.safeParse({
        kind: 'annotate',
        params: {
          metrics: [{ kind: 'sum', field: 'value', as: 'stat' }],
          selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'stat' }],
        },
      }).success,
    ).toBe(false);
    expect(
      TransformSchema.safeParse({
        kind: 'annotate',
        params: {
          selectors: [
            { selector: { kind: 'min', by: 'value' }, as: 'stat' },
            { selector: { kind: 'max', by: 'value' }, as: 'stat' },
          ],
        },
      }).success,
    ).toBe(false);
  });

  it('将注释限制为最多返回一行的选择器', () => {
    const accepted = [
      { kind: 'min', by: 'value' },
      { kind: 'max', by: 'value', tie: 'last' },
      { kind: 'first' },
      { kind: 'last', orderBy: [{ field: 'value' }] },
      { kind: 'nth', orderBy: [{ field: 'value' }], index: 1 },
      { kind: 'top', by: 'value', n: 1 },
      { kind: 'bottom', by: 'value', n: 1, tie: 'last' },
    ];
    const rejected = [
      { kind: 'min', by: 'value', tie: 'all' },
      { kind: 'max', by: 'value', tie: 'all' },
      { kind: 'top', by: 'value', n: 2 },
      { kind: 'top', by: 'value', n: 1, tie: 'all' },
      { kind: 'outside-quantile-band', field: 'value', lowerP: 0.25, upperP: 0.75 },
      { kind: 'custom-selector', field: 'value' },
    ];

    for (const selector of accepted) {
      expect(AnnotateSelectorSchema.safeParse({ selector, as: 'annotation' }).success).toBe(true);
    }

    for (const selector of rejected) {
      expect(AnnotateSelectorSchema.safeParse({ selector, as: 'annotation' }).success).toBe(false);
    }
  });

  it('接受自定义选择器进行选择但不进行注释', () => {
    const selector = { kind: 'custom-selector', field: 'value' };

    expect(SelectTransformSchema.safeParse({ kind: 'select', params: { selector } }).success).toBe(true);
    expect(AnnotateSelectorSchema.safeParse({ selector, as: 'annotation' }).success).toBe(false);
  });

  it('拒绝内置转换上的未知键，而不阻止外部配置', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: { field: 'month', oder: 'descending' } })).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: ['month'],
          metrics: [{ kind: 'count', as: 'rows', extra: true }],
        },
      }),
    ).toThrow();

    expect(TransformSchema.parse({ kind: 'host-transform', params: { extra: { enabled: true } } })).toEqual({
      kind: 'host-transform',
      params: { extra: { enabled: true } },
    });
  });

  it.each([
    ['function', () => true],
    ['symbol', Symbol('invalid')],
    ['bigint', BigInt(1)],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('通过本机 Zod 包罗万象的路径报告自定义 %s 叶', (_name, value) => {
    const schemas: Array<ZodType> = [ExternalTransformSchema, ReducerOperationSchema, SelectorOperationSchema];
    for (const schema of schemas) {
      const payload = { nested: [0, { bad: value }] };
      const isTransform = schema === ExternalTransformSchema;
      const result = schema.safeParse(
        isTransform ? { kind: 'host-operation', params: { payload } } : { kind: 'host-operation', payload },
      );

      expect(result.success).toBe(false);

      if (!result.success && isTransform) expect(result.error.issues.at(0)?.path).toEqual(['params', 'payload']);
    }
  });

  it.each(closedObjectSchemaCases)('$name 保持 JSON 往返等价并拒绝额外字段', ({ schema, value }) => {
    const parsed = schema.parse(value);

    expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(schema.safeParse({ ...value, extra: true }).success).toBe(false);
  });
});
