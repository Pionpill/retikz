import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={280} height={200}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    <Draw way={['center', { ellipse: { radiusX: 100, radiusY: 50 } }]} />
  </Tikz>
);

export default Demo;
