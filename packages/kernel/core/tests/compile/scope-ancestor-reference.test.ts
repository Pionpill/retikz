import { describe, expect, it } from 'vitest';

import type { IRChild, IRScene } from '../../src';
import { compileToScene } from '../../src';

const scene = (children: IRScene['children']): IRScene => ({ type: 'scene', version: 1, children });
const sources: Array<IRChild> = [
  { type: 'node', position: { of: 'outer', offset: [1, 0] } },
  { type: 'coordinate', id: 'point', position: { angle: 0, radius: 10, origin: 'outer' } },
  { type: 'node', position: { between: [{ id: 'outer' }, [10, 0]], fraction: 0.5 } },
  { type: 'scope', transforms: [{ kind: 'at-translate', of: 'outer', direction: 'right' }], children: [] },
  {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: { id: 'outer' } },
    ],
  },
];

describe('Scope ancestor geometry references', () => {
  it.each(sources)('rejects ancestor geometry in nested $type', child => {
    expect(() =>
      compileToScene(scene([{ type: 'scope', id: 'outer', children: [{ type: 'scope', children: [child] }] }])),
    ).toThrow(/ancestor Scope.*outer/);
  });

  it('allows a local Node shadowing the ancestor Scope name', () => {
    const result = compileToScene(
      scene([
        {
          type: 'scope',
          id: 'outer',
          localNamespace: true,
          children: [
            { type: 'node', id: 'outer', position: [20, 0] },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: { id: 'outer', anchor: 'center' } },
              ],
            },
          ],
        },
      ]),
    );
    const group = result.scene.primitives.find(primitive => primitive.type === 'group');
    const path = group?.type === 'group' ? group.children.find(primitive => primitive.type === 'path') : undefined;
    expect(path?.type === 'path' ? path.commands : []).toContainEqual({ kind: 'line', to: [20, 0] });
  });
});
