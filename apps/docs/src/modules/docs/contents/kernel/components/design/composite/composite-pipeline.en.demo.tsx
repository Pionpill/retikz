import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

const STAGE_GAP = 165;

const pipeline = defineComposite({
  namespace: 'demo',
  type: 'pipeline',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('pipeline'),
    stages: z.array(z.string()).min(2),
    arrows: z.array(z.string()),
  }),
  expand: (node, _context) => {
    void _context;
    const boxes = node.stages.map((label, i) => ({
      type: 'node' as const,
      id: `stage-${i}`,
      position: [i * STAGE_GAP, 0] as [number, number],
      shape: 'rectangle',
      text: label,
      style: { stroke: 'none' },
    }));
    const edges = node.stages.slice(1).map((_label, i) => ({
      type: 'path' as const,
      marks: [{ pos: 1, mark: { kind: 'arrow' as const } }],
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
    return { children: [...boxes, ...edges] };
  },
});

const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      namespace: 'demo',
      type: 'pipeline',
      stages: ['composite IR', 'Kernel IR', 'Scene', 'SVG / Canvas'],
      arrows: ['lower', 'compile', 'render'],
    },
  ],
};

const Demo: FC = () => <Layout ir={ir} extensions={{ composites: [pipeline] }} />;

export default Demo;
