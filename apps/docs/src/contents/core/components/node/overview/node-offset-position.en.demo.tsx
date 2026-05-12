import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `offset` arbitrary (dx, dy) relative positioning
 * @description position accepts `{ of, offset }` with `of` in three shapes — node id (A), Cartesian literal (pin), or polar (radius + angle as base); `offset` gives (dx, dy) directly, no hand-rolled atan2 / hypot
 */
const Demo: FC = () => (
  <Tikz width={460} height={260}>
    {/* of = id: offset from node A */}
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={{ of: 'A', offset: [120, 0] }}>right 120</Node>
    <Node id="C" position={{ of: 'A', offset: [60, 70] }}>right 60 down 70</Node>

    {/* of = Cartesian: no prior node needed */}
    <Coordinate id="pin" position={[-120, 70]} />
    <Node id="D" position={{ of: [-120, 70], offset: [0, 0] }} shape="circle">D</Node>

    {/* of = PolarPosition: polar base + offset */}
    <Node
      id="E"
      shape="diamond"
      position={{
        of: { origin: 'A', angle: 90, radius: 80 },
        offset: [40, 10],
      }}
    >E</Node>

    <Draw way={['A', 'B']} arrow="->" />
    <Draw way={['A', 'C']} arrow="->" />
    <Draw way={['A', 'D']} arrow="->" />
    <Draw way={['A', 'E']} arrow="->" />
  </Tikz>
);

export default Demo;
