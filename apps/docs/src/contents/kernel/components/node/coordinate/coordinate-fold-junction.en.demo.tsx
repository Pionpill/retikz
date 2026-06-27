import { Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate as a named junction for path convergence
 * @description Multiple step nodes converge to a shared decision junction with no rectangle or text; each path routes through via `<Draw way={['A', 'junction', 'B']}>` and endpoints clip to the 0×0 anchor center.
 */
const Demo: FC = () => (
  <Layout width={320} height={200}>
    <Node id="A" position={[-110, -55]}>A</Node>
    <Node id="B" position={[-110, 55]}>B</Node>
    <Coordinate id="junction" position={[0, 0]} />
    <Node id="out" position={[110, 0]} shape="diamond">merged</Node>
    {/* Two lines first reach junction, then merge into out */}
    <Draw way={['A', 'junction']} stroke="gray" />
    <Draw way={['B', 'junction']} stroke="gray" />
    <Draw way={['junction', 'out']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
