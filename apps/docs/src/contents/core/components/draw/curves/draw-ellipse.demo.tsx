import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={280} height={200}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    <Draw way={['center', { ellipse: { radiusX: 100, radiusY: 50 } }]} />
  </TikZ>
);

export default Demo;
