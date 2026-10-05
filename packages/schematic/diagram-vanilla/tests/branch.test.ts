import { createProcessingController, processToStaticInputResult } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { branchDiagram, BranchDiagramInputEmbedAdapter } from '../src/branch';

it('compiles Branch via the synchronous Vanilla embed', () => {
  const result = processToStaticInputResult(
    {
      children: [
        branchDiagram({
          nodes: [{ id: 'a', labels: [{ text: 'A' }] }, { id: 'b' }],
          branches: [{ id: 'main', nodes: ['a', 'b'] }],
        }),
      ],
    },
    { adapters: [BranchDiagramInputEmbedAdapter] },
  );

  expect(result.artifacts.some(artifact => artifact.kind === 'composite' && artifact.type === 'branch')).toBe(true);
  expect(JSON.stringify(result.scene)).toContain('A');
});

it('updates labels without retaining obsolete presentation content', () => {
  const source = (visible: boolean) => ({
    children: [
      branchDiagram({
        nodes: [{ id: 'a', ...(visible ? { labels: [{ text: 'Visible label' }] } : {}) }],
        branches: [{ id: 'main', nodes: ['a'] }],
      }),
    ],
  });
  const controller = createProcessingController(source(true), { adapters: [BranchDiagramInputEmbedAdapter] });

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
