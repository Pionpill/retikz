import type { IRScene, Scene } from '@retikz/core';

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

  it('同次返回 compile artifacts，Scene 输入固定为空 immutable 数组', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    };

    const compiled = toSceneResult(ir, { compile: { artifacts: { nodeLayouts: true } } });
    const passedScene = toSceneResult(scene, { compile: { artifacts: { nodeLayouts: true } } });

    expect(compiled.artifacts).toMatchObject([
      {
        kind: 'nodeLayout',
        occurrence: { sourcePath: 'children[0].node', expansionPath: [] },
        value: { id: 'a' },
      },
    ]);
    expect(Object.isFrozen(compiled.artifacts)).toBe(true);
    expect(passedScene.artifacts).toEqual([]);
    expect(Object.isFrozen(passedScene.artifacts)).toBe(true);
  });

  it('预编译 Scene 开启 inspector 时 fail-loud，不从 Scene 反推布局', () => {
    expect(() => toSceneResult(scene, { inspect: { layout: true } })).toThrow(
      'Vanilla Layout Inspector cannot run from a precompiled Scene.',
    );
  });
});
