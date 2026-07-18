import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { renderToSvgString } from '../../src';

/**
 * @retikz/vanilla composites 透传（SSR / 构建期）
 * @description CommonOptions.compile 承载 core CompileOptions；composites 随 compile 自动透传给 compileToScene；展开在 core
 */
const labeledBox = defineComposite({
  namespace: 'example',
  type: 'labeledBox',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('example'),
    type: z.literal('labeledBox'),
    text: z.string(),
  }),
  expand: node => ({ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }),
});

const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
};

describe('@retikz/vanilla composites 透传', () => {
  it('renderToSvgString 透传 composites → 渲染出 rect', () => {
    expect(renderToSvgString(ir, { compile: { composites: [labeledBox] } })).toContain('<rect');
  });

  it('未注入对应 composite → 跳过该节点（不抛、不渲染 rect）', () => {
    expect(() => renderToSvgString(ir)).not.toThrow();
    expect(renderToSvgString(ir)).not.toContain('<rect');
  });
});
