import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={120}>
    <Node id="a" position={[-60, 0]} rotate={0}>
      0°
    </Node>
    <Node id="b" position={[0, 0]} rotate={30}>
      30°
    </Node>
    <Node id="c" position={[60, 0]} rotate={60}>
      60°
    </Node>
  </TikZ>
);

export default Demo;
