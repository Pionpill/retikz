import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * The real point of `<Coordinate>` — **named virtual anchor** (English variant):
 * - hub is an invisible center point
 * - Four nodes use `at.of='hub'` to lay out symmetrically — moving hub moves all of them
 * - All four paths terminate at hub — lines converge at the center but hub itself draws no shape
 * - Without a coordinate: each node would need to duplicate `[0, 0]`, and each path would need an absolute `[0, 0]` literal
 */
const Demo: FC = () => (
  <Tikz width={460} height={300}>
    {/* Named virtual center — invisible, but the four `at.of` references all rely on it */}
    <Coordinate id="hub" position={[0, 0]} />
    <Node id="N" position={{ direction: 'above', of: 'hub', distance: 100 }}>North</Node>
    <Node id="S" position={{ direction: 'below', of: 'hub', distance: 100 }}>South</Node>
    <Node id="E" position={{ direction: 'right', of: 'hub', distance: 160 }} shape="circle">East</Node>
    <Node id="W" position={{ direction: 'left', of: 'hub', distance: 160 }} shape="circle">West</Node>
    {/* Four paths converge at hub — visually meeting at a center point with no drawn shape */}
    <Draw way={['N', 'hub']} arrow="->" />
    <Draw way={['S', 'hub']} arrow="->" />
    <Draw way={['E', 'hub']} arrow="->" />
    <Draw way={['W', 'hub']} arrow="->" />
  </Tikz>
);

export default Demo;
