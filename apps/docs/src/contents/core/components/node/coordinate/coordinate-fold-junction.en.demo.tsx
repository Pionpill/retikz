import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Another common Coordinate pattern in flow charts — **named junction for path convergence** (English variant):
 * - Multiple step nodes converge to a shared "decision junction"
 * - The junction is not a rectangle and has no text, just a meeting point — name it with a coordinate
 * - Each path routes through the junction with `<Draw way={['A', 'junction', 'B']}>`; coordinate is a 0×0 anchor and endpoints clip to its center
 */
const Demo: FC = () => (
  <Tikz width={460} height={280}>
    <Node id="A" position={[-180, -80]}>A</Node>
    <Node id="B" position={[-180, 80]}>B</Node>
    <Coordinate id="junction" position={[0, 0]} />
    <Node id="out" position={[180, 0]} shape="diamond">merged</Node>
    {/* Two lines first reach junction, then merge into out */}
    <Draw way={['A', 'junction']} />
    <Draw way={['B', 'junction']} />
    <Draw way={['junction', 'out']} arrow="->" />
  </Tikz>
);

export default Demo;
