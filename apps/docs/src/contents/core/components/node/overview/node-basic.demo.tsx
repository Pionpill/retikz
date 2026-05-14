import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={200} height={80}>
    <Node id="a" position={[0, 0]}>
      Hello
    </Node>
  </TikZ>
);

export default Demo;
