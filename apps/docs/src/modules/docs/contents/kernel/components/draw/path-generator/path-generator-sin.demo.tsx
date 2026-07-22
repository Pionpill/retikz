import type { FC } from 'react';

import { definePathGenerator } from '@retikz/core';
import { Layout, Path, Step } from '@retikz/react';
import { z } from 'zod';

const sin = definePathGenerator({
  name: 'sin',
  paramsSchema: z.strictObject({
    amplitude: z.number().nonnegative(),
    waves: z.number().int().positive(),
  }),
  generate: ({ from, to, params }) => {
    if (to === undefined) {
      throw new Error('path generator "sin" requires step.to.');
    }
    const amplitude = typeof params.amplitude === 'number' ? params.amplitude : 0;
    const waves = typeof params.waves === 'number' ? params.waves : 1;
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy);
    const normal: [number, number] = length === 0 ? [0, 0] : [-dy / length, dx / length];
    const pointAt = (t: number): [number, number] => {
      const offset = Math.sin(t * Math.PI * 2 * waves) * amplitude;
      return [from[0] + dx * t + normal[0] * offset, from[1] + dy * t + normal[1] * offset];
    };

    return Array.from({ length: waves * 4 }, (_, i) => {
      const start = i / (waves * 4);
      const end = (i + 1) / (waves * 4);
      return { kind: 'quad' as const, control: pointAt((start + end) / 2), to: pointAt(end) };
    });
  },
});

const Demo: FC = () => (
  <Layout width={420} height={140} viewBox={{ x: -210, y: -70, width: 420, height: 140 }} pathGenerators={[sin]}>
    <Path stroke="#2563eb" strokeWidth={2.2} arrow="->">
      <Step kind="move" to={[-170, 0]} />
      <Step kind="generator" name="sin" to={[170, 0]} params={{ amplitude: 34, waves: 3 }} />
    </Path>
  </Layout>
);

export default Demo;
