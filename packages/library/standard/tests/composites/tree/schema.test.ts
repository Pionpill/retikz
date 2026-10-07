import { expect, it } from 'vitest';

import { TreeSchema, TreeLayoutSchema } from '../../../src/collection/tree/schema';

const base = { namespace: 'standard', type: 'tree' };
it('root 保留字符串、对象配置、空树与空子槽', () => {
  for (const input of [
    { root: null },
    { root: 'A' },
    { root: { content: 'A', children: ['', null, { content: 'B', node: { shape: 'diamond' } }] } },
  ]) {
    const parsed = TreeSchema.parse({ ...base, ...input });
    expect(TreeSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  }
  expect(TreeLayoutSchema.parse({})).toEqual({ direction: 'down', levelGap: 32, siblingGap: 24 });
});
it('入口、内容、连接和身份错误在边界拒绝', () => {
  for (const input of [
    {},
    { root: 3 },
    { root: 'a', unexpected: false },
    { root: { content: 3 } },
    { root: { connection: {} } },
    { root: { children: [{ id: 'a' }, { id: 'a' }] } },
    { root: 'a', connection: { route: 'straight', fraction: 0.2 } },
    { root: 'a', layout: { levelGap: -1 } },
  ])
    expect(TreeSchema.safeParse({ ...base, ...input }).success).toBe(false);
});
