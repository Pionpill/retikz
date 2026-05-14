import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={280} height={200}>
    <Node id="center" position={[100, 100]} stroke="none">
      ·
    </Node>
    {/* { arc: {...} } 不消耗下一项——后面没有跟随 target */}
    <Draw way={['center', { arc: { startAngle: 0, endAngle: 90, radius: 60 } }]} />
    <Draw
      way={['center', { arc: { startAngle: 270, endAngle: 360, radius: 60 } }]}
      strokeDasharray="4 2"
    />
  </TikZ>
);

export default Demo;
