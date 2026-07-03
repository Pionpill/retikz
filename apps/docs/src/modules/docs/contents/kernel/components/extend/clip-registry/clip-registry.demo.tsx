import type { ClipDefinition, PathCommand } from '@retikz/core';
import type { FC } from 'react';

import { defineClip } from '@retikz/core';
import { Layout, Node, Scope } from '@retikz/react';
import { z } from 'zod';

const roundedRectClipSchema = z.strictObject({
  kind: z.literal('rounded-rect'),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  radius: z.number().nonnegative(),
});

type RoundedRectClipSpec = z.infer<typeof roundedRectClipSchema>;

const roundedRectClip: ClipDefinition = defineClip<RoundedRectClipSpec>({
  kind: 'rounded-rect',
  schema: roundedRectClipSchema,
  resolve: (spec) => {
    const x = spec.x;
    const y = spec.y;
    const right = spec.x + spec.width;
    const bottom = spec.y + spec.height;
    const radius = Math.min(spec.radius, spec.width / 2, spec.height / 2);
    const commands: Array<PathCommand> = [
      { kind: 'move', to: [x + radius, y] },
      { kind: 'line', to: [right - radius, y] },
      { kind: 'quad', control: [right, y], to: [right, y + radius] },
      { kind: 'line', to: [right, bottom - radius] },
      { kind: 'quad', control: [right, bottom], to: [right - radius, bottom] },
      { kind: 'line', to: [x + radius, bottom] },
      { kind: 'quad', control: [x, bottom], to: [x, bottom - radius] },
      { kind: 'line', to: [x, y + radius] },
      { kind: 'quad', control: [x, y], to: [x + radius, y] },
      { kind: 'close' },
    ];

    return { kind: 'path', commands };
  },
});

const Demo: FC = () => (
  <Layout width={430} height={220} clips={[roundedRectClip]}>
    <Scope clip={{ kind: 'rounded-rect', x: -150, y: -72, width: 300, height: 144, radius: 36 }}>
      <Node position={[-88, -8]} shape="circle" minimumSize={{ width: 160, height: 160 }} fill="skyblue" stroke="none" />
      <Node position={[84, 8]} shape="circle" minimumSize={{ width: 170, height: 170 }} fill="darkorange" stroke="none" />
      <Node
        position={[0, 0]}
        text="custom clip"
        minimumSize={{ width: 132, height: 42 }}
        fill="white"
        stroke="dodgerblue"
        strokeWidth={2}
      />
    </Scope>
    <Node position={[0, 92]} text="rounded-rect provider" fill="none" stroke="none" textColor="dimgray" />
  </Layout>
);

export default Demo;
