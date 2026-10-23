import { describe, expect, it } from 'vitest';

import { compileToScene, ScopeSchema } from '../../src';

describe('Scope context boundary', () => {
  it('accepts envelope context through JSON and rejects drawable configuration', () => {
    const source = { type: 'scope', id: 'group', boundingShape: 'circle', position: [0, 0], children: [] };
    expect(ScopeSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(ScopeSchema.safeParse({ ...source, frame: {} }).success).toBe(false);
  });

  it('does not draw an empty envelope', () => {
    const result = compileToScene({
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', id: 'empty', children: [] }],
    });
    const group = result.scene.primitives[0];
    expect(group).toMatchObject({ type: 'group', id: 'empty', children: [] });
  });
});
