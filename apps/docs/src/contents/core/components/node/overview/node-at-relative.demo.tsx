import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `at` 相对定位
 * @description position 接 `{ direction, of, distance? }` 描述节点关系而非手算坐标；<TikZ nodeDistance> 注入默认距离，node 自带 distance 时优先。
 */
const Demo: FC = () => (
  <TikZ width={460} height={220} nodeDistance={120}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={{ direction: 'right', of: 'A' }}>B</Node>
    <Node id="C" position={{ direction: 'right', of: 'B' }}>C</Node>
    <Node id="D" position={{ direction: 'below', of: 'B' }} shape="circle">D</Node>
    <Node
      id="E"
      shape="diamond"
      position={{ direction: 'below-right', of: 'D', distance: 80 }}
    >E</Node>
    <Draw way={['A', 'B']} arrow="->" />
    <Draw way={['B', 'C']} arrow="->" />
    <Draw way={['B', 'D']} arrow="->" />
    <Draw way={['D', 'E']} arrow="->" />
  </TikZ>
);

export default Demo;
