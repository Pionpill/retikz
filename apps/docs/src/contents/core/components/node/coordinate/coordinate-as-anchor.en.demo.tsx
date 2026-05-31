import { Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * `<Coordinate>` as a named virtual anchor
 * @description hub is an invisible center; four nodes `at.of='hub'` lay out symmetrically and all paths terminate at hub — without a coordinate every node/path would duplicate `[0, 0]`.
 */
const Demo: FC = () => (
  <Layout width={340} height={220}>
    {/* Named virtual center — invisible, but the four `at.of` references all rely on it */}
    <Coordinate id="hub" position={[0, 0]} />
    <Node id="N" position={{ direction: 'above', of: 'hub', distance: 65 }}>North</Node>
    <Node id="S" position={{ direction: 'below', of: 'hub', distance: 65 }}>South</Node>
    <Node id="E" position={{ direction: 'right', of: 'hub', distance: 110 }} shape="circle">East</Node>
    <Node id="W" position={{ direction: 'left', of: 'hub', distance: 110 }} shape="circle">West</Node>
    {/* Four paths converge at hub — visually meeting at a center point with no drawn shape */}
    <Draw way={['N', 'hub']} arrow="->" />
    <Draw way={['S', 'hub']} arrow="->" />
    <Draw way={['E', 'hub']} arrow="->" />
    <Draw way={['W', 'hub']} arrow="->" />
  </Layout>
);

export default Demo;
