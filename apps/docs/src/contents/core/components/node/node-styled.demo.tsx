import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={400} height={80}>
    <Node id="a" position={[-90, 0]} fill="#fef3c7" stroke="#f59e0b">
      Filled
    </Node>
    <Node id="b" position={[0, 0]} stroke="#3b82f6" strokeWidth={2}>
      Stroked
    </Node>
    <Node id="c" position={[90, 0]} padding={12} fontSize={18}>
      Big
    </Node>
  </Tikz>
);

export default Demo;
