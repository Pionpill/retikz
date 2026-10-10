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
import {
  BuiltinReducerOperationSchemas,
  ExternalReducerOperationSchema,
  ExternalSelectorOperationSchema,
} from '../../src/schemas/transform';

const closedObjectSchemaCases: Array<{
  name: string;
  schema: ZodType;
  value: Record<string, unknown>;
}> = [
  { name: 'order-by', schema: OrderBySchema, value: { field: 'month', order: 'ascending' } },
  {
    name: 'extent reducer',
    schema: BuiltinReducerOperationSchemas.Extent,
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

describe('transform schema', () => {
  it('parses transform operation and survives JSON round-trip', () => {
    const operation = TransformSchema.parse({ kind: 'sort', params: { field: 'month', order: 'ascending' } });

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects invalid built-in transform shape at schema boundary', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: { field: '' } })).toThrow();
    expect(ReducerOperationSchema.safeParse({ kind: 'sum' }).success).toBe(false);
    expect(SelectorOperationSchema.safeParse({ kind: 'min' }).success).toBe(false);
  });

  it('accepts scalar reducer candidates while excluding multi-output built-ins', () => {
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
  ])('rejects invalid extent output mappings: %j', as => {
    expect(BuiltinReducerOperationSchemas.Extent.safeParse({ kind: 'extent', field: 'value', as }).success).toBe(false);
  });

  it('reports extent endpoint conflicts at their declaration paths', () => {
    const duplicateEndpoint = BuiltinReducerOperationSchemas.Extent.safeParse({
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

  it('rejects transform output fields that collide within one operation', () => {
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

  it('limits annotate to selectors that return at most one row', () => {
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

  it('accepts custom selectors for select but not annotate', () => {
    const selector = { kind: 'custom-selector', field: 'value' };

    expect(SelectTransformSchema.safeParse({ kind: 'select', params: { selector } }).success).toBe(true);
    expect(AnnotateSelectorSchema.safeParse({ selector, as: 'annotation' }).success).toBe(false);
  });

  it('rejects unknown keys on built-in transforms without blocking external config', () => {
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
  ])('reports a custom %s leaf through the native Zod catchall path', (_name, value) => {
    const schemas: Array<ZodType> = [
      ExternalTransformSchema,
      ExternalReducerOperationSchema,
      ExternalSelectorOperationSchema,
    ];
    for (const schema of schemas) {
      const payload = { nested: [0, { bad: value }] };
      const isTransform = schema === ExternalTransformSchema;
      const result = schema.safeParse(
        isTransform ? { kind: 'host-operation', params: { payload } } : { kind: 'host-operation', payload },
      );

      expect(result.success).toBe(false);

      if (!result.success)
        expect(result.error.issues.at(0)?.path).toEqual(isTransform ? ['params', 'payload'] : ['payload']);
    }
  });

  it.each(closedObjectSchemaCases)('$name survives JSON round-trip and rejects extra fields', ({ schema, value }) => {
    const parsed = schema.parse(value);

    expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(schema.safeParse({ ...value, extra: true }).success).toBe(false);
  });
});
