import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { z } from 'zod';

/** A minimal data-driven composite */
export const barChart = defineComposite({
  namespace: 'demo',
  type: 'bar-chart',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('bar-chart'),
    data: z.array(z.number().nonnegative()).min(1),
  }),
  expand: node => {
    const peak = Math.max(...node.data, 1);
    return {
      children: node.data.map((value, index) => {
        const height = (value / peak) * 80;
        return {
          type: 'node' as const,
          position: [index * 38, -height / 2] as [number, number],
          shape: 'rectangle',
          layout: { minimumSize: { width: 24, height }, padding: 0 },
          style: { fill: 'currentColor', stroke: 'none' },
        };
      }),
    };
  },
});

/** Serializable input; executable definitions stay outside IR */
export const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'demo', type: 'bar-chart', data: [4, 7, 3, 8, 5, 6] }],
};
