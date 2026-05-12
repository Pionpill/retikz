import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate 用 OffsetPosition 链式定位
 * @description a → b → c 链式偏移：每个 coordinate 用 `{ of, offset }` 派生下一个；节点 N 再用最终 coordinate 作为 anchor，整组靠 a 一点驱动，移动 a 全跟着走
 */
const Demo: FC = () => (
  <Tikz width={460} height={240}>
    <Coordinate id="a" position={[-160, 0]} />
    <Coordinate id="b" position={{ of: 'a', offset: [100, 0] }} />
    <Coordinate id="c" position={{ of: 'b', offset: [100, 0] }} />
    <Node id="N1" position={{ of: 'a', offset: [0, 0] }}>a</Node>
    <Node id="N2" position={{ of: 'b', offset: [0, 50] }}>b 下 50</Node>
    <Node id="N3" position={{ of: 'c', offset: [0, -50] }} shape="circle">c 上 50</Node>
    <Draw way={['N1', 'N2']} arrow="->" />
    <Draw way={['N2', 'N3']} arrow="->" />
  </Tikz>
);

export default Demo;
