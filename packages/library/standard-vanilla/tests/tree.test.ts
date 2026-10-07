import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createProcessingController, normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { StandardInputEmbedAdapters } from '../src';
import { tree } from '../src/collection';

it('Tree自动装配并保留root稀疏Source', () => {
  for (const child of [tree({ root: 'A' }), tree({ root: { content: '2', children: [null] } }), tree({ root: null })]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
    expect(normalized.ir.children[0]).not.toHaveProperty('node');
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    expect(() => compileToScene(normalized.ir, options)).not.toThrow();
  }
});

it('重复节点身份的更新失败后保留上一棵完整树', () => {
  const controller = createProcessingController(
    scene({ children: [tree({ root: { id: 'parent', children: ['A'] } })] }),
    { adapters: StandardInputEmbedAdapters },
  );
  try {
    const previous = controller.read().scene;
    expect(() =>
      controller.update(scene({ children: [tree({ root: { id: 'same', children: [{ id: 'same' }] } })] })),
    ).toThrow();
    expect(controller.read().scene).toEqual(previous);
  } finally {
    controller.dispose();
  }
});
