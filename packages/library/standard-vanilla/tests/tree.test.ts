import { resolveCoreProviderDependencies } from '@retikz/core';
import { SceneRuntime, normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { tree } from '../src/collection';
import { compileTestResult } from './helpers/compilation';

it('Tree自动装配并保留root稀疏Source', () => {
  for (const child of [tree({ root: 'A' }), tree({ root: { content: '2', children: [null] } }), tree({ root: null })]) {
    const normalized = normalizeScene(scene({ children: [child] }));
    expect(normalized.ir.children[0]).not.toHaveProperty('node');
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    expect(() => compileTestResult(normalized.ir, options)).not.toThrow();
  }
});

it('重复节点身份的更新失败后保留上一棵完整树', () => {
  const controller = SceneRuntime.fromInput(scene({ children: [tree({ root: { id: 'parent', children: ['A'] } })] }));
  try {
    const previous = controller.current.compilation.result.scene;
    expect(() =>
      controller.replace(scene({ children: [tree({ root: { id: 'same', children: [{ id: 'same' }] } })] })),
    ).toThrow();
    expect(controller.current.compilation.result.scene).toEqual(previous);
  } finally {
    controller.dispose();
  }
});
