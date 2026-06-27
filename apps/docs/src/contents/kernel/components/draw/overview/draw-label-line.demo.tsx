import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={220} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="A" position={[20, 40]}>a</Node>
    <Node id="B" position={[400, 40]}>b</Node>
    {/* 直线：t 即归一化弧长 */}
    <Draw
      way={['A', { label: { text: 't=0.25', position: 0.25 } }, 'B']}
      arrow="->"
    />
    <Draw
      way={[
        [20, 110],
        { label: { text: 'midway', position: 'midway' } },
        [400, 110],
      ]}
      arrow="->"
    />
    <Draw
      way={[
        [20, 180],
        { label: { text: 't=0.75', position: 0.75 } },
        [400, 180],
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
