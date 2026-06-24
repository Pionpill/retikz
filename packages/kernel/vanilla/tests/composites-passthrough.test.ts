import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { IR } from '@retikz/core';
import { renderToSvgString } from '../src';

/**
 * @retikz/vanilla composites 透传（SSR / 构建期）
 * @description CommonOptions = { idPrefix, width, height } & CompileOptions，composites 随 CompileOptions
 *   自动透传给 compileToScene；展开在 core。
 */
const labeledBox = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('example'),
    type: z.literal('labeledBox'),
    text: z.string(),
  }),
  expand: node => ({ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }),
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
};

describe('@retikz/vanilla composites 透传', () => {
  it('renderToSvgString 透传 composites → 渲染出 rect', () => {
    expect(renderToSvgString(ir, { composites: [labeledBox] })).toContain('<rect');
  });

  it('未注入对应 composite → 跳过该节点（不抛、不渲染 rect）', () => {
    expect(() => renderToSvgString(ir)).not.toThrow();
    expect(renderToSvgString(ir)).not.toContain('<rect');
  });
});
