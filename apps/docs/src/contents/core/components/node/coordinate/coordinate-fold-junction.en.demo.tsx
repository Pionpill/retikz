import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate as a named junction for path convergence
 * @description Multiple step nodes converge to a shared decision junction with no rectangle or text; each path routes through via `<Draw way={['A', 'junction', 'B']}>` and endpoints clip to the 0×0 anchor center.
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
