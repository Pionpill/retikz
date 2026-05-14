import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={400} height={160}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Draw way={['a', [120, 0]]} />
    <Draw way={['a', { origin: 'a', angle: 60, radius: 80 }]} />
    <Draw way={[[0, 60], [120, 60]]} />
  </TikZ>
);

export default Demo;
