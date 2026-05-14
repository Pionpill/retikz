import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="a" position={[20, 30]}>
      A
    </Node>
    <Node id="b" position={[380, 150]}>
      B
    </Node>
    {/* Fold N=2：每段占 1/N=0.5 t 区间，拐角恒在 t=0.5（与段长无关）；
        via='-|' 先水平后垂直，拐角在右上；via='|-' 先垂直后水平，拐角在左下 */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step
        kind="step"
        via="-|"
        to="b"
        label={{ text: "'-|' t=0.5 (corner)", position: 0.5 }}
      />
    </Path>
    <Path stroke="currentColor" arrow="->" strokeDasharray="3 3">
      <Step kind="move" to="a" />
      <Step
        kind="step"
        via="|-"
        to="b"
        label={{ text: "'|-' t=0.5 (corner)", position: 0.5, side: 'below' }}
      />
    </Path>
  </TikZ>
);

export default Demo;
