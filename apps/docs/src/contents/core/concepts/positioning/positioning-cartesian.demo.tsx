import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={120}>
    <Node id="a" position={[0, 0]}>
      [0, 0]
    </Node>
    <Node id="b" position={[100, 0]}>
      [100, 0]
    </Node>
    <Node id="c" position={[50, 60]}>
      [50, 60]
    </Node>
  </TikZ>
);

export default Demo;
