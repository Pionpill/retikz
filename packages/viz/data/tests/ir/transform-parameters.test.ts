import { describe, expect, it } from 'vitest';
import { number, strictObject } from 'zod';

import {
  applyTransforms,
  defineTransform,
  defineTransformImplementation,
  resolveTransformRegistry,
  SortTransformSchema,
  SummarizeTransformSchema,
  TransformSchema,
} from '../../src';

describe('transform parameter contract', () => {
  it('preserves the operation envelope through JSON round-trip', () => {
    const operation = { kind: 'sort', params: { field: 'value', order: 'descending' } };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('requires params and rejects additional envelope fields', () => {
    expect(SortTransformSchema.safeParse({ kind: 'sort' }).success).toBe(false);
    expect(SortTransformSchema.safeParse({ kind: 'sort', params: { field: 'value' }, extra: true }).success).toBe(
      false,
    );
    expect(TransformSchema.safeParse({ kind: 'custom', params: {}, extra: true }).success).toBe(false);
    expect(TransformSchema.safeParse({ kind: 'custom', params: { callback: () => 1 } }).success).toBe(false);
  });

  it('locates cross-field parameter errors inside params', () => {
    const result = SummarizeTransformSchema.safeParse({
      kind: 'summarize',
      params: { groupBy: ['team'], metrics: [{ kind: 'count', as: 'team' }] },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['params', 'metrics', 0, 'as']);
  });

  it('assembles a custom definition and applies parsed parameter defaults', () => {
    const definition = defineTransform({
      kind: 'multiply',
      paramsSchema: strictObject({ factor: number().default(2) }),
      inputFields: () => ['value'],
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const implementation = defineTransformImplementation({
      definition,
      apply: (rows, operation) => rows.map(row => ({ ...row, value: Number(row.value) * operation.params.factor })),
    });
    expect(definition.schema.parse({ kind: 'multiply', params: {} })).toEqual({
      kind: 'multiply',
      params: { factor: 2 },
    });
    expect(
      applyTransforms([{ value: 3 }], [{ kind: 'multiply', params: {} }], {
        registry: resolveTransformRegistry([definition]),
        transformImplementations: [implementation],
      }),
    ).toEqual([{ value: 6 }]);
  });
});
