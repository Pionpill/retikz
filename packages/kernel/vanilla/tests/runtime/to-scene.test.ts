import type { Scene } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import { toSceneResult } from '../../src/runtime/to-scene';

const scene: Scene = {
  layout: { x: 0, y: 0, width: 1, height: 1 },
  primitives: [],
};

describe('toSceneResult runtime metadata', () => {
  it('为不同 Scene 输入结果创建互不共享的空 metadata', () => {
    const first = toSceneResult(scene, {});
    const second = toSceneResult(scene, {});

    expect(first.runtimeMeta).not.toBe(second.runtimeMeta);
    expect(first.runtimeMeta.layers).not.toBe(second.runtimeMeta.layers);
    expect(first.runtimeMeta.identityIndex).not.toBe(second.runtimeMeta.identityIndex);
    expect(first.runtimeMeta.parentIndex).not.toBe(second.runtimeMeta.parentIndex);
  });
});
