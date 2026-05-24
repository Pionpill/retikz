import type { ArrowDefinition } from '@retikz/core';
import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * 颜色继承：箭头不写死颜色，emit 把 ctx.fill 原样交给 marker。
 * 无 color override 时 ctx.fill = { kind:'contextStroke' }，物化为 SVG context-stroke——
 * 同一个箭头定义用在不同描边色的 path 上，箭头自动跟随各自的 stroke（主题反应不冻结）。
 */
const tri: ArrowDefinition = {
  lineContactX: 0,
  tipX: 10,
  emit: ({ fill }) => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [0, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [0, 10] },
        { kind: 'close' },
      ],
      fill,
    },
  ],
};

const Demo: FC = () => (
  <Layout width={320} height={90} arrows={{ tri }}>
    <Draw way={[[0, 0], [140, 0]]} arrow="->" arrowDetail={{ shape: 'tri' }} stroke="#ef4444" strokeWidth={1.5} />
    <Draw way={[[0, 40], [140, 40]]} arrow="->" arrowDetail={{ shape: 'tri' }} stroke="#10b981" strokeWidth={1.5} />
  </Layout>
);

export default Demo;
