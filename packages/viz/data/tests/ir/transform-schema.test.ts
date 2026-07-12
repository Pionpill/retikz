import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import {
  AnnotateSelectorSchema,
  AnnotateTransformSchema,
  OrderBySchema,
  OutsideQuantileBandBoundarySpecSchema,
  OutsideQuantileBandSelectorOperationSchema,
  QuantileBandOutputsSchema,
  QuantileBandPointOutputSchema,
  QuantileBandReducerOperationSchema,
  QuantileBandWhiskerSpecSchema,
  ReducerOperationSchema,
  SelectorOperationSchema,
  SelectTransformSchema,
  SummarizeTransformSchema,
  TransformOperationSchema,
  TransformSchema,
} from '../../src';

const closedObjectSchemaCases: Array<{
  name: string;
  schema: ZodType;
  value: Record<string, unknown>;
}> = [
  { name: 'order-by', schema: OrderBySchema, value: { field: 'month', order: 'ascending' } },
  { name: 'quantile point', schema: QuantileBandPointOutputSchema, value: { p: 0.5, as: 'median' } },
  { name: 'min/max whisker', schema: QuantileBandWhiskerSpecSchema, value: { kind: 'minMax' } },
  { name: 'spread whisker', schema: QuantileBandWhiskerSpecSchema, value: { kind: 'spread', factor: 1.5 } },
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
  { name: 'band boundary', schema: OutsideQuantileBandBoundarySpecSchema, value: { kind: 'band' } },
  {
    name: 'spread boundary',
    schema: OutsideQuantileBandBoundarySpecSchema,
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
    value: { kind: 'summarize', groupBy: ['month'], metrics: [{ kind: 'count', as: 'rows' }] },
  },
  {
    name: 'select transform',
    schema: SelectTransformSchema,
    value: { kind: 'select', groupBy: ['month'], selector: { kind: 'min', by: 'value' } },
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
      groupBy: ['month'],
      selectors: [{ selector: { kind: 'max', by: 'value' }, as: 'isMax' }],
    },
  },
];

describe('transform schema', () => {
  it('parses transform operation and survives JSON round-trip', () => {
    const operation = TransformOperationSchema.parse({ kind: 'sort', field: 'month', order: 'ascending' });

    expect(TransformOperationSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('rejects invalid built-in transform shape at schema boundary', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', field: '' })).toThrow();
    expect(ReducerOperationSchema.safeParse({ kind: 'sum' }).success).toBe(false);
    expect(SelectorOperationSchema.safeParse({ kind: 'min' }).success).toBe(false);
  });

  it('rejects unknown keys on built-in transforms without blocking external config', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', field: 'month', oder: 'descending' })).toThrow();
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        groupBy: ['month'],
        metrics: [{ kind: 'count', as: 'rows', extra: true }],
      }),
    ).toThrow();

    expect(TransformSchema.parse({ kind: 'host-transform', extra: { enabled: true } })).toEqual({
      kind: 'host-transform',
      extra: { enabled: true },
    });
  });

  it.each(closedObjectSchemaCases)('$name survives JSON round-trip and rejects extra fields', ({ schema, value }) => {
    const parsed = schema.parse(value);

    expect(schema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    expect(schema.safeParse({ ...value, extra: true }).success).toBe(false);
  });
});
