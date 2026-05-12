import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate offset chain
 * @description a → b → c chained offsets: each coordinate derives the next via `{ of, offset }`; nodes anchor to the final coordinates, so moving `a` shifts the entire group
 */
const Demo: FC = () => (
  <Tikz width={460} height={240}>
    <Coordinate id="a" position={[-160, 0]} />
    <Coordinate id="b" position={{ of: 'a', offset: [100, 0] }} />
    <Coordinate id="c" position={{ of: 'b', offset: [100, 0] }} />
    <Node id="N1" position={{ of: 'a', offset: [0, 0] }}>a</Node>
    <Node id="N2" position={{ of: 'b', offset: [0, 50] }}>b down 50</Node>
    <Node id="N3" position={{ of: 'c', offset: [0, -50] }} shape="circle">c up 50</Node>
    <Draw way={['N1', 'N2']} arrow="->" />
    <Draw way={['N2', 'N3']} arrow="->" />
  </Tikz>
);

export default Demo;
