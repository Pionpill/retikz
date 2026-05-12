import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * step.to with OffsetPosition: path endpoint = base + (dx, dy)
 * @description Three paths demonstrate the three `of` shapes — node id (endpoint = A + (60, 0)), Cartesian literal (endpoint = (60, 50) + (0, 0)), polar base (endpoint = polar(A,0,60) + (0, 30)); no calc gymnastics
 */
const Demo: FC = () => (
  <Tikz width={500} height={260}>
    <Node id="A" position={[-160, 30]}>A</Node>

    {/* of=id: path terminates at A + (60, 0) */}
    <Path arrow="->" stroke="steelblue">
      <Step kind="move" to="A" />
      <Step kind="line" to={{ of: 'A', offset: [60, 0] }} label={{ text: 'id+offset', side: 'above' }} />
    </Path>

    {/* of=Cartesian literal: endpoint = (60, 50) */}
    <Path arrow="->" stroke="forestgreen">
      <Step kind="move" to="A" />
      <Step
        kind="line"
        to={{ of: [60, 50], offset: [0, 0] }}
        label={{ text: 'cartesian+offset', side: 'below' }}
      />
    </Path>

    {/* of=PolarPosition: base = polar(A, 0, 100), then + (0, 60) */}
    <Path arrow="->" stroke="crimson">
      <Step kind="move" to="A" />
      <Step
        kind="line"
        to={{
          of: { origin: 'A', angle: 0, radius: 100 },
          offset: [0, 60],
        }}
        label={{ text: 'polar+offset', side: 'sloped' }}
      />
    </Path>
  </Tikz>
);

export default Demo;
