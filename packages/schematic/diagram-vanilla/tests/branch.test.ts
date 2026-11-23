import { SceneRuntime, compileToScene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { branchDiagram } from '../src/branch';

it('通过同步 Vanilla 嵌入编译 Branch', () => {
  const result = compileToScene({
    type: 'scene',
    children: [
      branchDiagram({
        nodes: [{ id: 'a', labels: [{ text: 'A' }] }, { id: 'b' }],
        branches: [{ id: 'main', nodes: ['a', 'b'] }],
      }),
    ],
  });

  expect(result.artifacts.some(artifact => artifact.type === 'branch')).toBe(true);
  expect(JSON.stringify(result.scene)).toContain('A');
});

it('更新标签而不保留过时的演示内容', () => {
  const source = (visible: boolean) => ({
    type: 'scene' as const,
    children: [
      branchDiagram({
        nodes: [{ id: 'a', ...(visible ? { labels: [{ text: 'Visible label' }] } : {}) }],
        branches: [{ id: 'main', nodes: ['a'] }],
      }),
    ],
  });
  const controller = SceneRuntime.fromInput(source(true));

  try {
    const initial = controller.read().compilation.result;

    expect(JSON.stringify(initial.scene)).toContain('Visible label');

    controller.replace(source(false));

    expect(JSON.stringify(controller.read().compilation.result.scene)).not.toContain('Visible label');

    controller.replace(source(true));

    expect(controller.read().compilation.result.scene).toEqual(initial.scene);
  } finally {
    controller.dispose();
  }
});
