import { describe, expect, it } from 'vitest';

import { compileToScene, ScopeSchema } from '../../src';

describe('Scope 上下文边界', () => {
  it('通过 JSON 接受信封上下文并拒绝可绘制配置', () => {
    const source = { type: 'scope', id: 'group', boundingShape: 'circle', position: [0, 0], children: [] };
    expect(ScopeSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(ScopeSchema.safeParse({ ...source, frame: {} }).success).toBe(false);
  });

  it('不绘制空信封', () => {
    const result = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', id: 'empty', children: [] }],
    });
    const group = result.scene.primitives[0];
    expect(group).toMatchObject({ type: 'group', id: 'empty', children: [] });
  });
});
