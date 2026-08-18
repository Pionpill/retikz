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

type RoundedRectClip = z.infer<typeof roundedRectClipSchema>;

const roundedRectClip: ClipDefinition = defineClip<RoundedRectClip, RoundedRectClip>({
  kind: 'rounded-rect',
  schema: roundedRectClipSchema,
  resolve: spec => spec,
  shapeSchema: roundedRectClipSchema,
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

const Demo: FC = () => (
  <Layout width={430} height={184} clips={[roundedRectClip]}>
    <Scope clip={{ kind: 'rounded-rect', x: -150, y: -72, width: 300, height: 144, radius: 36 }}>
      <Node
        position={[-88, -8]}
        shape="circle"
        minimumSize={{ width: 160, height: 160 }}
        fill="skyblue"
        stroke="none"
      />
      <Node
        position={[84, 8]}
        shape="circle"
        minimumSize={{ width: 170, height: 170 }}
        fill="darkorange"
        stroke="none"
      />
      <Node
        position={[0, 0]}
        text="custom clip"
        minimumSize={{ width: 132, height: 42 }}
        fill="white"
        stroke="dodgerblue"
        strokeWidth={2}
      />
    </Scope>
    <Node position={[0, 80]} text="rounded-rect provider" fill="none" stroke="none" textColor="dimgray" />
  </Layout>
);

export default Demo;
