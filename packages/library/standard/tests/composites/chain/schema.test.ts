import { expect, it } from 'vitest';

import { ChainSchema } from '../../../src/collection/chain';

const base = { namespace: 'standard', type: 'chain' };
it('嵌套骨架错误指向原始数组路径且 JSON 往返保留结构', () => {
  const invalid = ChainSchema.safeParse({
    ...base,
    skeleton: { items: ['A', { branches: [[{ branches: [['B'], ['C']] }, 'D'], ['E']] }, 'F'] },
  });

  expect(invalid.success).toBe(false);

  if (!invalid.success)
    expect(invalid.error.issues).toContainEqual(
      expect.objectContaining({ path: ['skeleton', 'items', 1, 'branches', 0, 0] }),
    );

  const parsed = ChainSchema.parse({ ...base, skeleton: { items: ['A', { branches: [['B'], ['C']] }, 'D'] } });

  expect(ChainSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
});
it('骨架保留计数与符号，并支持递归分叉', () => {
  for (const skeleton of [
    { count: 0 },
    { labels: ['A', ''] },
    { items: ['A', { branches: [['B'], ['C', 'D']] }, 'E'] },
  ])
    expect(ChainSchema.safeParse({ ...base, skeleton }).success).toBe(true);
});
it('结构错误不降级成空单元或线性链', () => {
  for (const skeleton of [
    { count: 2, labels: ['A'] },
    { items: [{ branches: [['A'], ['B']] }, 'C'] },
    { items: ['A', { branches: [[], ['B']] }, 'C'] },
    { items: ['A', { branches: [['B']] }, 'C'] },
  ])
    expect(ChainSchema.safeParse({ ...base, skeleton }).success).toBe(false);

  expect(ChainSchema.safeParse({ ...base, skeleton: { count: 2 }, data: [] }).success).toBe(false);
});
it('分支主干下标与路径结构字段受约束', () => {
  expect(
    ChainSchema.safeParse({
      ...base,
      skeleton: { items: ['A', { branches: [['B'], ['C']] }, 'D'] },
      layout: { branchAlign: { branch: 2 } },
    }).success,
  ).toBe(false);
  expect(ChainSchema.safeParse({ ...base, items: [], connection: { path: { children: [] } } }).success).toBe(false);
});

it('三段路由与折转比例支持 JSON 往返并拒绝越界比例', () => {
  for (const route of ['-|-', '|-|']) {
    const source = { ...base, items: [], connection: { route, fraction: 1 } };
    const parsed = ChainSchema.parse(source);
    expect(ChainSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    for (const fraction of [-0.1, 1.1])
      expect(ChainSchema.safeParse({ ...source, connection: { route, fraction } }).success).toBe(false);
  }
});

it('折转比例只属于显式三段路由，根与局部分支都拒绝错配字段', () => {
  for (const connection of [
    { fraction: 0.25 },
    ...['auto', 'straight', '|-', '-|'].map(route => ({ route, fraction: 0.25 })),
  ]) {
    expect(ChainSchema.safeParse({ ...base, items: [], connection }).success).toBe(false);
    expect(
      ChainSchema.safeParse({
        ...base,
        items: ['A', { kind: 'parallel', connection, branches: [{ items: ['B'] }, { items: ['C'] }] }, 'D'],
      }).success,
    ).toBe(false);
  }
});
