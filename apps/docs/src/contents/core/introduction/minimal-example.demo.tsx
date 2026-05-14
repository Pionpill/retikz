import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const MinimalExample: FC = () => (
  <TikZ width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} />
  </TikZ>
);

export default MinimalExample;
