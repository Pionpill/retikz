import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={420} height={200}>
    <Node id="a" position={[20, 30]}>
      A
    </Node>
    <Node id="b" position={[380, 150]}>
      B
    </Node>
    {/* Fold N=2：每段占 1/N=0.5 t 区间，拐角恒在 t=0.5（与段长无关） */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step
        kind="step"
        via="-|"
        to="b"
        label={{ text: 't=0.25 (seg-1 mid)', position: 0.25 }}
      />
    </Path>
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to={[20, 60]} />
      <Step
        kind="step"
        via="-|"
        to={[380, 180]}
        label={{ text: 't=0.5 (corner)', position: 0.5, side: 'below' }}
      />
    </Path>
  </Tikz>
);

export default Demo;
