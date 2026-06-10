import type { IR } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/** Horizontal step gap (user units): distance between adjacent stage-box centers */
const STAGE_GAP = 165;

/**
 * Example Tier 2 type: pipeline — expands { stages, arrows } into N stage boxes + N−1 labelled arrows (node + path mix).
 * Shows "small IR, expanded at runtime": the IR stores only two short arrays (self-describing, easy for an LLM to author / read);
 *   all geometry (boxes / connectors / arrows / labels / boundary clipping) is generated at compile time inside `expand`, never in the IR.
 * The diagram depicts the very path a composite itself travels: Tier 2 DSL → composite IR → (lower) → core IR → (render) → graph.
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
    // One labelled arrow between adjacent stages; endpoints reference node ids and auto-clip to the (border-less) text box
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
