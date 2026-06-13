import { describe, expect, it } from 'vitest';
import { node } from '../src/builder/node';
import { scope } from '../src/builder/scope';

describe('@retikz/vanilla scope()', () => {
  it('scope-children：scope(config, children[]) → IRScope，children 原样', () => {
    const s = scope({ transforms: [{ kind: 'translate', x: 40, y: 20 }] }, [
      node('c', { position: [0, 80], text: 'C' }),
    ]);
    expect(s).toEqual({
      type: 'scope',
      transforms: [{ kind: 'translate', x: 40, y: 20 }],
      children: [{ type: 'node', id: 'c', position: [0, 80], text: 'C' }],
    });
  });

  it('scope-transforms-order：transforms 逐字保序，无 xshift/yshift 顶层字段', () => {
    const t1 = { kind: 'translate', x: 10, y: 0 } as const;
    const t2 = { kind: 'rotate', degrees: 30 } as const;
    const s = scope({ transforms: [t1, t2] }, []);
    expect(s.type).toBe('scope');
    if (s.type !== 'scope') throw new Error('unreachable');
    expect(s.transforms).toEqual([t1, t2]); // 数组顺序 = 应用顺序
    expect('xshift' in s).toBe(false);
    expect('yshift' in s).toBe(false);
  });

  it('scope-builder：scope(config, build) 回调式收集 children，等价数组式', () => {
    const viaArray = scope({ transforms: [{ kind: 'translate', x: 40, y: 0 }] }, [
      node('c', { position: [0, 0], text: 'C' }),
    ]);
    const viaBuild = scope({ transforms: [{ kind: 'translate', x: 40, y: 0 }] }, (s) =>
      s.node('c', { position: [0, 0], text: 'C' }),
    );
    expect(viaBuild).toEqual(viaArray);
  });
});
