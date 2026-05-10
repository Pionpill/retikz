import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate 在流程图中的另一个常用场景——**命名拐点汇聚**（中文版）：
 * - 多个 step 节点向同一个"决策汇合点"收敛
 * - 汇合点本身不是矩形 / 不打字，只是几条线的交汇——用 coordinate 命名它
 * - 各 path 用 `<Draw way={['A', 'junction', 'B']}>` 经过汇合点；coordinate 是 0×0 锚点，端点贴中心
 */
const Demo: FC = () => (
  <Tikz width={460} height={280}>
    <Node id="A" position={[-180, -80]}>A</Node>
    <Node id="B" position={[-180, 80]}>B</Node>
    <Coordinate id="junction" position={[0, 0]} />
    <Node id="out" position={[180, 0]} shape="diamond">汇合后</Node>
    {/* 两条线先各自走到 junction，再合并到 out */}
    <Draw way={['A', 'junction']} />
    <Draw way={['B', 'junction']} />
    <Draw way={['junction', 'out']} arrow="->" />
  </Tikz>
);

export default Demo;
