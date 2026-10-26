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

  lower: spec => {
    const right = spec.params.x + spec.params.width;
    const bottom = spec.params.y + spec.params.height;
    const radius = Math.min(spec.params.radius, spec.params.width / 2, spec.params.height / 2);
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [spec.params.x + radius, spec.params.y] },
      { kind: 'line', to: [right - radius, spec.params.y] },
      { kind: 'quad', control: [right, spec.params.y], to: [right, spec.params.y + radius] },
      { kind: 'line', to: [right, bottom - radius] },
      { kind: 'quad', control: [right, bottom], to: [right - radius, bottom] },
      { kind: 'line', to: [spec.params.x + radius, bottom] },
      { kind: 'quad', control: [spec.params.x, bottom], to: [spec.params.x, bottom - radius] },
      { kind: 'line', to: [spec.params.x, spec.params.y + radius] },
      { kind: 'quad', control: [spec.params.x, spec.params.y], to: [spec.params.x + radius, spec.params.y] },
      { kind: 'close' },
    ];

    return { commands, fillRule: 'nonzero' };
  },
});
