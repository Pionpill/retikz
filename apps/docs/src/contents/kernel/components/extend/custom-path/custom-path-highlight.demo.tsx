import type { FC } from 'react';

import { definePathKind, Layout, Node, Path, Step } from '@retikz/react';
import { z } from 'zod';

const highlight = definePathKind({
  kind: 'highlight',
  optionsSchema: z
    .object({
      stroke: z.string().min(1),
      strokeWidth: z.number().positive().optional(),
    })
    .strict(),
  compile: context => {
    const base = context.emitStroke({
      ...context.path,
      strokeWidth: context.options.strokeWidth ?? context.path.strokeWidth ?? 10,
    });
    if (base === null) return null;
    return {
      ...base,
      primitives: base.primitives.map(primitive =>
        primitive.type === 'path'
          ? {
              ...primitive,
              stroke: context.options.stroke,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }
          : primitive,
      ),
    };
  },
});

const Demo: FC = () => (
  <Layout width={360} height={120} pathKinds={{ highlight }}>
    <Path kind="highlight" kindOptions={{ stroke: '#facc15', strokeWidth: 14 }} zIndex={-1}>
      <Step kind="move" to="api" />
      <Step kind="line" to="core" />
      <Step kind="line" to="render" />
    </Path>
    <Path stroke="#0f766e" strokeWidth={1.5} arrow="->">
      <Step kind="move" to="api" />
      <Step kind="line" to="core" />
      <Step kind="line" to="render" />
    </Path>
    <Node id="api" position={[0, 0]} shape="rectangle" fill="white">
      API
    </Node>
    <Node id="core" position={[120, 0]} shape="rectangle" fill="white">
      Core
    </Node>
    <Node id="render" position={[240, 0]} shape="rectangle" fill="white">
      Render
    </Node>
  </Layout>
);

export default Demo;
