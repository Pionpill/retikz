import { Coordinate, Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate 作为命名拐点汇聚
 * @description 多个 step 节点向同一决策汇合点收敛，汇合点本身不画矩形 / 不打字；各 path 用 `<Draw way={['A', 'junction', 'B']}>` 经过它，coordinate 是 0×0 锚点端点贴中心。
 */
const Demo: FC = () => (
  <TikZ width={460} height={280}>
    <Node id="A" position={[-180, -80]}>A</Node>
    <Node id="B" position={[-180, 80]}>B</Node>
    <Coordinate id="junction" position={[0, 0]} />
    <Node id="out" position={[180, 0]} shape="diamond">汇合后</Node>
    {/* 两条线先各自走到 junction，再合并到 out */}
    <Draw way={['A', 'junction']} />
    <Draw way={['B', 'junction']} />
    <Draw way={['junction', 'out']} arrow="->" />
  </TikZ>
);

export default Demo;
