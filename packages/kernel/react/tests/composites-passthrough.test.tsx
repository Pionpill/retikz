import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import type { IR } from '@retikz/core';
import { Layout } from '../src/kernel/Layout';

/**
 * <Layout composites={...}> Tier 2 透传
 * @description React 把 composites prop 透传给 compileToScene 的 CompileOptions.composites；
 *   展开始终在 core。本轮 Tier 2 节点经 <Layout ir={...}> 直喂。
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

describe('<Layout composites> Tier 2 透传', () => {
  it('注入 composites 后含 composite 的 IR 渲染出 rect', () => {
    const svg = renderToStaticMarkup(<Layout width={100} height={100} ir={ir} composites={[labeledBox]} />);
    expect(svg).toContain('<rect');
  });

  it('未注入对应 composite → 跳过该节点（不抛、不渲染 rect）', () => {
    expect(() => renderToStaticMarkup(<Layout width={100} height={100} ir={ir} />)).not.toThrow();
    expect(renderToStaticMarkup(<Layout width={100} height={100} ir={ir} />)).not.toContain('<rect');
  });
});
