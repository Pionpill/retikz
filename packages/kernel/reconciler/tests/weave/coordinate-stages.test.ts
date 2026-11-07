import type { IRScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile';
import { readWeaveCurrent, WeaveManager } from '../../src/weave';

describe('Coordinate 三层复用', () => {
  it('真实坐标引用拒绝不存在的命名锚点', () => {
    expect(() =>
      compileToScene({
        type: 'scene',
        version: 1,
        children: [
          { type: 'coordinate', id: 'point', position: [0, 0] },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'point', anchor: 'unknown' } },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ],
      }),
    ).toThrow(/Unknown anchor 'unknown'/);
  });
  it('显式默认距离复用编译位置，提交后更换引用仍更新依赖并可回滚', () => {
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'a', position: [0, 0] },
        { type: 'coordinate', id: 'b', position: [100, 0] },
        { type: 'coordinate', id: 'c', position: { of: 'a', direction: 'right' } },
        { type: 'node', position: { of: 'c', direction: 'right', distance: 0 } },
      ],
    };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const coordinate = readWeaveCurrent(mounted.root).children[2];
    if (coordinate.type !== 'coordinate') throw new Error('Expected coordinate');
    const previous = readWeaveCurrent(coordinate).compiled;
    const explicit = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'c' },
          input: { type: 'coordinate', id: 'c', position: { of: 'a', direction: 'right', distance: 24 } },
        },
      ],
    });
    expect(explicit.visited).toBe(0);
    expect(explicit.compilation.result).toEqual(mounted.compilation.result);
    explicit.commit();
    explicit.finish();
    expect(readWeaveCurrent(coordinate).compiled).toBe(previous);
    const changed = { type: 'coordinate', id: 'c', position: { of: 'b', direction: 'right', distance: 24 } } as const;
    const update = session.update({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'c' }, input: changed }],
    });
    expect(update.compilation.result).toEqual(
      compileToScene({ ...source, children: [source.children[0], source.children[1], changed, source.children[3]] }),
    );
    update.rollback();
    expect(readWeaveCurrent(coordinate).compiled).toBe(previous);
  });
});
