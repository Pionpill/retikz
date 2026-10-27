import { createProcessingController, processToStaticInputResult } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { branchDiagram, branchDiagramInputEmbedAdapter } from '../src/branch';

it('通过同步 Vanilla 嵌入编译 Branch', () => {
  const result = processToStaticInputResult(
    {
      children: [
        branchDiagram({
          nodes: [{ id: 'a', labels: [{ text: 'A' }] }, { id: 'b' }],
          branches: [{ id: 'main', nodes: ['a', 'b'] }],
        }),
      ],
    },
    { adapters: [branchDiagramInputEmbedAdapter] },
  );

  expect(result.artifacts.some(artifact => artifact.kind === 'composite' && artifact.type === 'branch')).toBe(true);
  expect(JSON.stringify(result.scene)).toContain('A');
});

it('更新标签而不保留过时的演示内容', () => {
  const source = (visible: boolean) => ({
    children: [
      branchDiagram({
        nodes: [{ id: 'a', ...(visible ? { labels: [{ text: 'Visible label' }] } : {}) }],
        branches: [{ id: 'main', nodes: ['a'] }],
      }),
    ],
  });
  const controller = createProcessingController(source(true), { adapters: [branchDiagramInputEmbedAdapter] });

  try {
    const initial = controller.read();

    expect(JSON.stringify(initial.scene)).toContain('Visible label');

    controller.update(source(false));

    expect(JSON.stringify(controller.read().scene)).not.toContain('Visible label');

    controller.update(source(true));

    expect(controller.read().scene).toEqual(initial.scene);
  } finally {
    controller.dispose();
  }
});
