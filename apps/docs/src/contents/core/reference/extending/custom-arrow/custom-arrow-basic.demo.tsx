import type { ArrowDefinition } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义箭头：TikZ Bracket 样式（空心方括号 [）——一条 stroke 路径勾出"┌…└"括号，与内置三角形箭头明显不同。
 * 几何在局部 baseSize=10 坐标系（viewBox 0 0 10 10）；hollow:true → 框架丢 fill、用描边、lineContactX 自动减 lineWidth/2。
 * stroke 取 ctx.stroke（无 color override 时为 contextStroke，跟随 path 描边色）。
 */
const bracket: ArrowDefinition = {
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
};

const Demo: FC = () => (
  <Layout width={320} height={70} arrows={{ bracket }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[140, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" arrowDetail={{ shape: 'bracket' }} stroke="blue" strokeWidth={1.5} />
  </Layout>
);

export default Demo;
