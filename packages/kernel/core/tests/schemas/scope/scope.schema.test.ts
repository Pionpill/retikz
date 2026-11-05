import { describe, expect, it } from 'vitest';

import { ChildSchema, ScopeSchema } from '../../../src/schemas';

describe('Scope 递归子项接线', () => {
  it('总入口递归解析内核与组合子项，并保留扩展负载', () => {
    const children = [
      { type: 'node', position: [0, 0] },
      { type: 'path', kind: 'custom', kindOptions: { weight: 2 } },
      { type: 'coordinate', id: 'A', position: [1, 2] },
      { namespace: 'example', type: 'badge', extra: { text: 'kept' } },
    ];
    const source = { type: 'scope', position: [0, 0], children: [{ type: 'scope', position: [0, 0], children }] };
    expect(ChildSchema.parse(source)).toEqual(source);
  });

  it('递归解析仍拒绝更深层子项中的非法定位', () => {
    const result = ScopeSchema.safeParse({
      type: 'scope',
      children: [{ type: 'scope', children: [{ type: 'node', position: [0, Infinity] }] }],
    });
    expect(result.success).toBe(false);
  });
});
