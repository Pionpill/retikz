import type { PathCommand } from '@retikz/core';
import { defineClip } from '@retikz/core';
import { z } from 'zod';

export const roundedRectClipSchema = z.strictObject({
  kind: z.literal('rounded-rect'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  radius: z.number().nonnegative(),
});

export const roundedRectClip = defineClip({
  kind: 'rounded-rect',
  schema: roundedRectClipSchema,
  lower: shape => {
    const right = shape.x + shape.width;
    const bottom = shape.y + shape.height;
    const radius = Math.min(shape.radius, shape.width / 2, shape.height / 2);
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [shape.x + radius, shape.y] },
      { kind: 'line', to: [right - radius, shape.y] },
      { kind: 'quad', control: [right, shape.y], to: [right, shape.y + radius] },
      { kind: 'line', to: [right, bottom - radius] },
      { kind: 'quad', control: [right, bottom], to: [right - radius, bottom] },
      { kind: 'line', to: [shape.x + radius, bottom] },
      { kind: 'quad', control: [shape.x, bottom], to: [shape.x, bottom - radius] },
      { kind: 'line', to: [shape.x, shape.y + radius] },
      { kind: 'quad', control: [shape.x, shape.y], to: [shape.x + radius, shape.y] },
      { kind: 'close' },
    ];

    return { commands, fillRule: 'nonzero' };
  },
});
