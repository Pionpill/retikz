import type { IRScene, IRScope, IRCoordinate } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile';
import { readWeaveCurrent, WeaveReconciler } from '../../src/weave';

describe('Scope 三层复用', () => {
  it('显式默认变换复用最终包络，外部引用变化重新放置且回滚不污染缓存', () => {
    const scope: IRScope = {
      type: 'scope',
      id: 'box',
      transforms: [{ kind: 'offset-translate', of: 'origin' }],
      children: [{ type: 'node', text: 'A' }],
    };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'coordinate', id: 'origin', position: [10, 20] }, scope],
    };
    const session = new WeaveReconciler(source);
    const mounted = session.mount();
    const child = readWeaveCurrent(mounted.root).children[1];
    if (child.type !== 'scope') throw new Error('Expected scope');
    const previous = readWeaveCurrent(child).compiled;
    const explicit: IRScope = { ...scope, transforms: [{ kind: 'offset-translate', of: 'origin', offset: [0, 0] }] };
    const equivalent = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'box' },
          input: explicit,
        },
      ],
    });
    expect(equivalent.compilation.result).toEqual(mounted.compilation.result);
    equivalent.commit();
    equivalent.finish();
    expect(readWeaveCurrent(child).compiled).toBe(previous);
    const moved: IRCoordinate = { type: 'coordinate', id: 'origin', position: [40, 50] };
    const changed = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'origin' },
          input: moved,
        },
      ],
    });
    expect(changed.compilation.result).toEqual(compileToScene({ ...source, children: [moved, explicit] }));
    expect(changed.compilation.result).not.toEqual(mounted.compilation.result);
    changed.rollback();
    expect(readWeaveCurrent(child).compiled).toBe(previous);
  });
});
