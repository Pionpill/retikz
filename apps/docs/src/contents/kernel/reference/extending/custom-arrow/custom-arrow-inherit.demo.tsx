import { defineArrow } from '@retikz/core';
import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * 颜色继承：Bracket 箭头是空心 stroke，emit 把 ctx.stroke 原样交给 marker。
 * 无 color override 时 ctx.stroke = contextStroke，物化为 SVG context-stroke——
 * 同一个 bracket 定义用在不同描边色的 path 上，括号自动跟随各自的 stroke（主题反应不冻结）。
 */
const bracket = defineArrow({
  hollow: true,
  lineContactX: 2,
  tipX: 8,
  defaultLength: 9,
  defaultWidth: 9,
  emit: ({ stroke, lineWidth }) => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [8, 1] },
        { kind: 'line', to: [2, 1] },
        { kind: 'line', to: [2, 9] },
        { kind: 'line', to: [8, 9] },
      ],
      stroke: typeof stroke === 'string' ? stroke : 'context-stroke',
      strokeWidth: lineWidth,
    },
  ],
});

const Demo: FC = () => (
  <Layout width={320} height={90} arrows={{ bracket }}>
    <Draw way={[[0, 0], [140, 0]]} arrow="->" arrowDetail={{ shape: 'bracket' }} stroke="red" strokeWidth={1.5} />
    <Draw way={[[0, 40], [140, 40]]} arrow="->" arrowDetail={{ shape: 'bracket' }} stroke="green" strokeWidth={1.5} />
  </Layout>
);

export default Demo;
