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

describe('变换参数契约', () => {
  it('通过 JSON 往返保留操作包络', () => {
    const operation = { kind: 'sort', params: { field: 'value', order: 'descending' } };
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('需要参数并拒绝额外的包络字段', () => {
    expect(SortTransformSchema.safeParse({ kind: 'sort' }).success).toBe(false);
    expect(SortTransformSchema.safeParse({ kind: 'sort', params: { field: 'value' }, extra: true }).success).toBe(
      false,
    );
    expect(TransformSchema.safeParse({ kind: 'custom', params: {}, extra: true }).success).toBe(false);
    expect(TransformSchema.safeParse({ kind: 'custom', params: { callback: () => 1 } }).success).toBe(false);
  });

  it('定位 params 内的跨字段参数错误', () => {
    const result = SummarizeTransformSchema.safeParse({
      kind: 'summarize',
      params: { groupBy: ['team'], metrics: [{ kind: 'count', as: 'team' }] },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['params', 'metrics', 0, 'as']);
  });

  it('组装自定义定义并应用解析的参数默认值', () => {
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
      }).rows,
    ).toEqual([{ value: 6 }]);
  });
});
