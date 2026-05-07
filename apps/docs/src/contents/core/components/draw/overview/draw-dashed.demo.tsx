import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={400} height={120}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Node id="c" position={[120, 60]}>
      C
    </Node>
    <Draw way={['a', 'b']} stroke="#3b82f6" strokeWidth={2} />
    <Draw way={['b', 'c']} strokeDasharray="4 2" />
  </Tikz>
);

export default Demo;
