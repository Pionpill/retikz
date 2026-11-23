import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, string } from 'zod';

import { compileToScene, renderToSvgString } from '../../src';

/*
 * @retikz/vanilla composites 透传（SSR / 构建期）
 * @description ProcessingOptions.compile 承载 core CompileOptions；composites 随 compile 自动透传给 SceneReconciler；展开在 core
 */
const labeledBox = defineComposite({
  namespace: 'example',
  type: 'labeledBox',
  schema: CompositeBaseSchema.extend({
    namespace: literal('example'),
    type: literal('labeledBox'),
    text: string(),
  }),
  compile: node => ({
    children: [{ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }],
  }),
});

const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
};

describe('@retikz/vanilla composites 透传', () => {
  it('编译时注入 composite 后，SVG 包含展开的矩形', () => {
    expect(
      renderToSvgString(compileToScene(ir, { compile: { composites: [labeledBox] } }).compileResult.scene),
    ).toContain('<rect');
  });

  it('未注入对应 composite → 跳过该节点（不抛、不渲染 rect）', () => {
    expect(renderToSvgString(compileToScene(ir).compileResult.scene)).not.toContain('<rect');
  });
});
