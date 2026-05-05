import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const MinimalExample: FC = () => (
  <Tikz width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} />
  </Tikz>
);

export default MinimalExample;
