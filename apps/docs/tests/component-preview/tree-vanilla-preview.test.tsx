import { createInputScene } from '@retikz/react';
import { createProcessingController } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderTreePreview } from '../../src/modules/docs/contents/library/standard/collection/tree/tree-layout.preview';
import { synchronousInputAdaptersOf } from '../../src/modules/docs/lib';

it('Tree previews preserve root configuration in four directions', () => {
  for (const direction of ['down', 'up', 'left', 'right'] as const) {
    const result = buildVanillaPreview(
      buildPreviewIR(() =>
        renderTreePreview({ direction, gap: '32', empty: false, missing: true, arrows: true, styled: true }),
      ),
    );
    expect(result.svg).toContain('dodgerblue');
    expect(result.svg).toContain('darkorange');
    expect(result.code).toContain('tree(');
    expect(result.code).toContain('TreeInputEmbedAdapter');
    expect(result.code).toContain('root:');
  }
});
it('Tree retained updates remove and restore nodes and missing slots', () => {
  const inputScene = (empty: boolean, missing: boolean) =>
    createInputScene(
      renderTreePreview({ direction: 'down', gap: '32', empty, missing, arrows: true, styled: true }).props.children,
    );
  const first = inputScene(false, true);
  const controller = createProcessingController(first.scene, { adapters: synchronousInputAdaptersOf(first.adapters) });
  try {
    for (const missing of [true, false])
      for (const empty of [true, false]) {
        controller.update(inputScene(empty, missing).scene);
        expect(JSON.stringify(controller.read().scene).includes('dodgerblue')).toBe(!empty);
        expect(JSON.stringify(controller.read().scene).includes('darkorange')).toBe(!empty);
      }
  } finally {
    controller.dispose();
  }
});

it('Tree 默认预览不将 undefined 写入 retained Source', () => {
  const input = createInputScene(
    renderTreePreview({
      direction: 'down',
      gap: '32',
      empty: false,
      missing: true,
      arrows: true,
      styled: false,
    }).props.children,
  );
  const controller = createProcessingController(input.scene, { adapters: synchronousInputAdaptersOf(input.adapters) });
  try {
    expect(controller.read().scene.primitives.length).toBeGreaterThan(0);
  } finally {
    controller.dispose();
  }
});
