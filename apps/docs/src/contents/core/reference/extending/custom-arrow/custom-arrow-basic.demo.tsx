import type { ArrowDefinition } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义箭头：三角尖 + 尾部圆点（复合几何，演示 emit 可产多个 MarkerPrimitive）。
 * 几何写在局部 baseSize=10 坐标系（viewBox 0 0 10 10）；lineContactX=0 表示线接在 x=0 的尾缘。
 * `fill` 直接取 ctx.fill（无 color override 时为 contextStroke，跟随 path 描边色）。
 */
const dotTip: ArrowDefinition = {
  lineContactX: 0,
  tipX: 10,
  emit: ({ fill }) => [
    {
      type: 'path',
      commands: [
        { kind: 'move', to: [2, 0] },
        { kind: 'line', to: [10, 5] },
        { kind: 'line', to: [2, 10] },
        { kind: 'close' },
      ],
      fill,
    },
    { type: 'ellipse', cx: 2, cy: 5, rx: 2, ry: 2, fill },
  ],
};

const Demo: FC = () => (
  <Layout width={320} height={70} arrows={{ dotTip }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[140, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" arrowDetail={{ shape: 'dotTip' }} stroke="#3b82f6" strokeWidth={1.5} />
  </Layout>
);

export default Demo;
