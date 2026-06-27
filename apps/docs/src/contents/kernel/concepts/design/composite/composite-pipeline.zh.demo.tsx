import type { IR } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/** 横向步距（user units）：相邻阶段框中心的间距 */
const STAGE_GAP = 165;

/**
 * 示例 Tier 2 type：pipeline —— 据 { stages, arrows } 展开成「N 个阶段框 + N−1 条带标签箭头」（node + path 混合）。
 * 体现「体积小、运行时展开」：IR 里只存两个短数组（语义自描述、LLM 易生成易读），
 *   框 / 连线 / 箭头 / 标签 / 边界裁剪等几何全在 compile 期由 expand 现场生成，不进 IR。
 * 图中画的正是 composite 自身经历的链路：Tier 2 DSL → composite IR →（lower）→ core IR →（render）→ graph。
 */
const pipeline = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('pipeline'),
    stages: z.array(z.string()).min(2),
    arrows: z.array(z.string()),
  }),
  expand: node => {
    const boxes = node.stages.map((label, i) => ({
      type: 'node' as const,
      id: `stage-${i}`,
      position: [i * STAGE_GAP, 0] as [number, number],
      shape: 'rectangle',
      text: label,
      stroke: 'none',
    }));
    // 相邻两阶段间一条带标签箭头；端点给 node id，自动裁剪到（无边框的）文本框
    const edges = node.stages.slice(1).map((_label, i) => ({
      type: 'path' as const,
      arrow: '->' as const,
      children: [
        { type: 'step' as const, kind: 'move' as const, to: { id: `stage-${i}` } },
        {
          type: 'step' as const,
          kind: 'line' as const,
          to: { id: `stage-${i + 1}` },
          label: { text: node.arrows[i] ?? '', textColor: 'gray' },
        },
      ],
    }));
    return [...boxes, ...edges];
  },
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [
    {
      namespace: 'demo',
      type: 'pipeline',
      stages: ['Tier 2 DSL', 'composite IR', 'core IR', 'graph'],
      arrows: ['build', 'lower', 'render'],
    },
  ],
};

const Demo: FC = () => (
  <Layout ir={ir} composites={[pipeline]} width={680} height={110} style={{ maxWidth: '100%', height: 'auto' }} />
);

export default Demo;
