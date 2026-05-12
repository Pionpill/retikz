import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={420} height={200}>
    <Node id="a" position={[40, 160]}>
      A
    </Node>
    <Node id="b" position={[380, 160]}>
      B
    </Node>
    {/* Quadratic Bezier：t 是 Bezier 参数（非弧长）；t=0.5 通常不是视觉中点 */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step
        kind="curve"
        control={[210, 20]}
        to="b"
        label={{ text: 't=0.25', position: 0.25 }}
      />
    </Path>
    <Path stroke="currentColor" strokeDasharray="3 3">
      <Step kind="move" to="a" />
      <Step
        kind="curve"
        control={[210, 20]}
        to="b"
        label={{ text: 'midway (Bezier t=0.5)', position: 'midway', side: 'below' }}
      />
    </Path>
  </Tikz>
);

export default Demo;
