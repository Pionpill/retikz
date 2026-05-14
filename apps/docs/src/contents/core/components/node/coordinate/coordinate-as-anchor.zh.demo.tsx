import { Coordinate, Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * `<Coordinate>` 作为命名虚拟锚点
 * @description hub 是不可见中心，4 个节点 `at.of='hub'` 对称分布、4 条 path 都终止在 hub 自身不画形状；没有 coordinate 的话节点 / path 都得各自重复 [0,0]。
 */
const Demo: FC = () => (
  <TikZ width={460} height={300}>
    {/* 命名虚拟中心——画面里看不见，但下面 4 个 at.of 都靠它 */}
    <Coordinate id="hub" position={[0, 0]} />
    <Node id="N" position={{ direction: 'above', of: 'hub', distance: 100 }}>北</Node>
    <Node id="S" position={{ direction: 'below', of: 'hub', distance: 100 }}>南</Node>
    <Node id="E" position={{ direction: 'right', of: 'hub', distance: 160 }} shape="circle">东</Node>
    <Node id="W" position={{ direction: 'left', of: 'hub', distance: 160 }} shape="circle">西</Node>
    {/* 4 条 path 终止在 hub——视觉上汇于中心点；hub 是 coordinate 不画形状 */}
    <Draw way={['N', 'hub']} arrow="->" />
    <Draw way={['S', 'hub']} arrow="->" />
    <Draw way={['E', 'hub']} arrow="->" />
    <Draw way={['W', 'hub']} arrow="->" />
  </TikZ>
);

export default Demo;
