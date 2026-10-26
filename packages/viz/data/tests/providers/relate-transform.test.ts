import { describe, expect, it } from 'vitest';

import { applyTransforms, resolveTransformRegistry, TransformSchema } from '../../src';

describe('关联变换', () => {
  const operation = {
    kind: 'relate',
    params: {
      source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
      target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'x', y: 'value', id: 'id' } },
      measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
    },
  };

  it('接受关联 schema 并保留 JSON 往返', () => {
    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('拒绝不带 by 的最小/最大选择器', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'relate',
        params: {
          source: { selector: { kind: 'min' }, fields: { id: 'id' } },
          target: { selector: { kind: 'max', by: 'value' }, fields: { id: 'id' } },
        },
      }),
    ).toThrow();
  });

  it('拒绝具有空字段的端点选择器', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'relate',
        params: {
          source: { selector: { kind: 'first' }, fields: {} },
          target: { selector: { kind: 'last' }, fields: { id: 'id' } },
        },
      }),
    ).toThrow();
  });

  it('从最小到最大导出一个全局关系行', () => {
    const rows = applyTransforms(
      [
        { id: 'a', x: 0, value: 12 },
        { id: 'b', x: 1, value: 4 },
        { id: 'c', x: 2, value: 21 },
      ],
      [operation],
      { registry: resolveTransformRegistry() },
    ).rows;

    expect(rows).toEqual([
      {
        sourceX: 1,
        sourceY: 4,
        sourceId: 'b',
        targetX: 2,
        targetY: 21,
        targetId: 'c',
        delta: 17,
        deltaLabel: '+17',
      },
    ]);
  });

  it('每组导出一个关系行', () => {
    const rows = applyTransforms(
      [
        { group: 'A', id: 'a1', x: 0, value: 12 },
        { group: 'A', id: 'a2', x: 1, value: 4 },
        { group: 'B', id: 'b1', x: 0, value: 7 },
        { group: 'B', id: 'b2', x: 1, value: 15 },
      ],
      [{ ...operation, params: { ...operation.params, groupBy: ['group'] } }],
      { registry: resolveTransformRegistry() },
    ).rows;

    expect(rows).toEqual([
      expect.objectContaining({ group: 'A', sourceId: 'a2', targetId: 'a1', delta: 8 }),
      expect.objectContaining({ group: 'B', sourceId: 'b1', targetId: 'b2', delta: 8 }),
    ]);
  });

  it('使用确定性平局处理并跳过没有有限值的组', () => {
    const rows = applyTransforms(
      [
        { group: 'A', id: 'first', value: 10 },
        { group: 'A', id: 'last', value: 10 },
        { group: 'B', id: 'missing', value: undefined },
      ],
      [
        {
          kind: 'relate',
          params: {
            groupBy: ['group'],
            source: { selector: { kind: 'max', by: 'value', tie: 'last' }, fields: { id: 'id' } },
            target: { selector: { kind: 'first' }, fields: { id: 'id' } },
          },
        },
      ],
      { registry: resolveTransformRegistry() },
    ).rows;

    expect(rows).toEqual([expect.objectContaining({ group: 'A', sourceId: 'last', targetId: 'first' })]);
  });
});
