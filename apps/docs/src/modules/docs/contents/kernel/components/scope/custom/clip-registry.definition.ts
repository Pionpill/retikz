import type { PathCommand } from '@retikz/core';
import { defineClip } from '@retikz/core';
import { z } from 'zod';

export const roundedRectClipSchema = z.strictObject({
  kind: z.literal('rounded-rect'),
  params: z.strictObject({
    x: z.number(),
    y: z.number(),
    width: z.number().positive(),
    height: z.number().positive(),
    radius: z.number().nonnegative(),
  }),
});

export const roundedRectClip = defineClip({
  kind: 'rounded-rect',
  schema: roundedRectClipSchema,
  lower: shape => {
    const right = shape.params.x + shape.params.width;
    const bottom = shape.params.y + shape.params.height;
    const radius = Math.min(shape.params.radius, shape.params.width / 2, shape.params.height / 2);
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [shape.params.x + radius, shape.params.y] },
      { kind: 'line', to: [right - radius, shape.params.y] },
      { kind: 'quad', control: [right, shape.params.y], to: [right, shape.params.y + radius] },
      { kind: 'line', to: [right, bottom - radius] },
      { kind: 'quad', control: [right, bottom], to: [right - radius, bottom] },
      { kind: 'line', to: [shape.params.x + radius, bottom] },
      { kind: 'quad', control: [shape.params.x, bottom], to: [shape.params.x, bottom - radius] },
      { kind: 'line', to: [shape.params.x, shape.params.y + radius] },
      { kind: 'quad', control: [shape.params.x, shape.params.y], to: [shape.params.x + radius, shape.params.y] },
      { kind: 'close' },
    ];

    return { commands, fillRule: 'nonzero' };
  },
});
