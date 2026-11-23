import { createInputScene } from '@retikz/react';
import { SceneRuntime } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import { buildVanillaPreview } from '../../src/modules/docs/components/component-preview/vanilla-preview';
import { renderTreePreview } from '../../src/modules/docs/contents/library/standard/collection/tree/tree-layout.preview';

it('Tree 预览保留四个方向的根配置', () => {
  for (const direction of ['down', 'up', 'left', 'right'] as const) {
    const result = buildVanillaPreview(
      buildPreviewIR(() =>
        renderTreePreview({ direction, gap: '32', empty: false, missing: true, arrows: true, styled: true }),
      ),
    );
    expect(result.svg).toContain('dodgerblue');
    expect(result.svg).toContain('darkorange');
    expect(result.code).toContain('tree(');
    expect(result.code).not.toContain('treeInputEmbedAdapter');
    expect(result.code).toContain('root:');
  }
});
it('Tree 的保留模式更新移除并恢复节点及缺失槽位', () => {
  const inputScene = (empty: boolean, missing: boolean) =>
    createInputScene(
      renderTreePreview({ direction: 'down', gap: '32', empty, missing, arrows: true, styled: true }).props.children,
    );
  const first = inputScene(false, true);
  const controller = SceneRuntime.fromInput(first);
  try {
    for (const missing of [true, false])
      for (const empty of [true, false]) {
        controller.replaceInput(inputScene(empty, missing));
        expect(JSON.stringify(controller.current.compilation.result.scene).includes('dodgerblue')).toBe(!empty);
        expect(JSON.stringify(controller.current.compilation.result.scene).includes('darkorange')).toBe(!empty);
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
  const controller = SceneRuntime.fromInput(input);
  try {
    expect(controller.current.compilation.result.scene.primitives.length).toBeGreaterThan(0);
  } finally {
    controller.dispose();
  }
});
