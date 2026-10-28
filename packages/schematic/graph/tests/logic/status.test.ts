import { describe, expect, it } from 'vitest';

import * as Graph from '../../src';

const entity = (status?: string) =>
  Graph.EntitySchema.parse({
    namespace: 'graph',
    type: 'entity',
    role: 'activity',
    position: [0, 0],
    ...(status === undefined ? {} : { status }),
  });

const relation = (status?: string) =>
  Graph.RelationSchema.parse({
    namespace: 'graph',
    type: 'relation',
    source: { id: 'source' },
    target: { id: 'target' },
    role: 'flow',
    ...(status === undefined ? {} : { status }),
  });

describe('Graph 语义状态', () => {
  it.each(['error', 'success', 'warning', 'disabled'] as const)(
    '保留 Entity 和 Relation Source 中关闭的 %s 状态',
    status => {
      expect(entity(status)).toMatchObject({ status });
      expect(relation(status)).toMatchObject({ status });
    },
  );

  it('在未编写语义状态时保持省略状态', () => {
    expect(entity()).not.toHaveProperty('status');
    expect(relation()).not.toHaveProperty('status');
  });

  it.each(['', 'pending', ['error'], { value: 'error' }] as const)('拒绝 Source schema 边界处的无效状态', status => {
    expect(() => entity(status as string)).toThrow();
    expect(() => relation(status as string)).toThrow();
  });

  it('按状态匹配主题选择器，无需注册表定义', () => {
    const selector = Graph.GraphEntityThemeSelectorSchema.parse({ status: ['warning', 'error'] });

    expect(Graph.matchesGraphThemeSelector(selector, { role: 'activity', status: 'warning' })).toBe(true);
    expect(Graph.matchesGraphThemeSelector(selector, { role: 'activity', status: 'success' })).toBe(false);
  });

  it('将 Relation 状态选择器与有效方向结合起来', () => {
    const selector = Graph.GraphRelationThemeSelectorSchema.parse({
      status: 'warning',
      direction: 'forward',
    });

    expect(Graph.matchesGraphThemeSelector(selector, { role: 'flow', status: 'warning', direction: 'forward' })).toBe(
      true,
    );
    expect(Graph.matchesGraphThemeSelector(selector, { role: 'flow', status: 'warning', direction: 'none' })).toBe(
      false,
    );
  });

  it('不从域谓词参数推断 Graph 状态', () => {
    const source = Graph.EntitySchema.parse({
      namespace: 'graph',
      type: 'entity',
      role: 'activity',
      position: [0, 0],
      predicate: { name: 'custom-state', params: { status: 'error' } },
    });

    expect(source).not.toHaveProperty('status');
    expect(source.predicate).toEqual({ name: 'custom-state', params: { status: 'error' } });
  });
});
