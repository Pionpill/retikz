import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={300} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Path strokeDasharray="6 3" stroke="#10b981" strokeWidth={2}>
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </Tikz>
);

export default Demo;
