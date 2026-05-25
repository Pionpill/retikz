import type { IR } from '@retikz/core';
import { definePathGenerator } from '@retikz/core';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { z } from 'zod';

/**
 * 抛物线生成器：from → to，bend 顶层 Target 作 quad 控制点。
 * core 不内置任何曲线；这里在外部用 definePathGenerator 注册，经 <Layout pathGenerators> 注入。
 * generator step 目前走 IR 直传（<Layout ir>），正体现 path generator 的 IR 级扩展本质。
 */
const parabola = definePathGenerator({
  paramsSchema: z.object({ bend: z.tuple([z.number(), z.number()]) }),
  targetParams: ['bend'],
  generate: ({ from, to, resolvedTargets }) => [
    { kind: 'quad', control: resolvedTargets.bend, to: to ?? from },
  ],
});

const ir: IR = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      stroke: 'teal',
      strokeWidth: 1.5,
      arrow: '->',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'generator', name: 'parabola', to: [160, 0], params: { bend: [80, -70] } },
      ],
    },
  ],
};

const Demo: FC = () => <Layout ir={ir} pathGenerators={{ parabola }} width={320} height={100} />;

export default Demo;
