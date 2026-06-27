import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="center" position={[100, 100]} stroke="none">
      ·
    </Node>
    {/* { arc: {...} } 不消耗下一项——后面没有跟随 target */}
    <Draw way={['center', { arc: { startAngle: 0, endAngle: 90, radius: 60 } }]} />
    <Draw
      way={['center', { arc: { startAngle: 270, endAngle: 360, radius: 60 } }]}
      dashPattern={[4, 2]}
    />
  </Layout>
);

export default Demo;
