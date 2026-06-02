import type { IR } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/**
 * 示例 Tier 2 type：labeledBox —— 一个高层节点据 props 展开成 rect 框 + 下方 caption（两个 Tier 1）。
 * core 不内置任何 composite；domain 包用 defineComposite 注册，经 <Layout composites> 注入。
 * 节点经 IR 直传（<Layout ir>），体现 Tier 2 的 IR 级扩展本质。
 */
const labeledBox = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('labeledBox'),
    text: z.string(),
    caption: z.string(),
  }),
  expand: node => [
    { type: 'node', id: 'box', position: [0, 0], shape: 'rectangle', text: node.text },
    { type: 'node', position: [0, 46], stroke: 'none', textColor: 'gray', text: node.caption },
  ],
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'demo', type: 'labeledBox', text: 'Tier 2', caption: 'one node → many Tier 1' }],
};

const Demo: FC = () => <Layout ir={ir} composites={[labeledBox]} width={240} height={120} />;

export default Demo;
