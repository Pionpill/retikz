import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={300} height={120}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Node id="c" position={[120, 60]}>
      C
    </Node>
    <Path>
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
      <Step kind="move" to={[0, 60]} />
      <Step kind="line" to="c" />
    </Path>
  </Tikz>
);

export default Demo;
