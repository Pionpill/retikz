import type { IR, PathCommand } from '@retikz/core';
import { definePathGenerator } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/**
 * 正弦波生成器：沿 from → to 采样多段 line（含 sub-path），amplitude / waves 为 JSON params。
 * generate 返回低层 PathCommand[]，cursor 落最后命令终点。
 */
const sin = definePathGenerator({
  paramsSchema: z.object({ amplitude: z.number(), waves: z.number() }),
  generate: ({ from, to, params }) => {
    const end = to ?? [from[0] + 200, from[1]];
    const amplitude = params.amplitude as number;
    const waves = params.waves as number;
    const samples = 64;
    const cmds: Array<PathCommand> = [];
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      cmds.push({
        kind: 'line',
        to: [from[0] + (end[0] - from[0]) * t, from[1] + Math.sin(t * Math.PI * 2 * waves) * amplitude],
      });
    }
    return cmds;
  },
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      stroke: 'green',
      strokeWidth: 1.5,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'sin', to: [260, 0], params: { amplitude: 28, waves: 2 } },
      ],
    },
  ],
};

const Demo: FC = () => <Layout ir={ir} pathGenerators={{ sin }} width={320} height={90} />;

export default Demo;
