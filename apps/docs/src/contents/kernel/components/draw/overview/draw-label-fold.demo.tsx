import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="A" position={[20, 30]}>a</Node>
    <Node id="B" position={[380, 150]}>b</Node>
    {/* Fold N=2：每段占 1/N=0.5 t 区间，拐角恒在 t=0.5（与段长无关）；
        '-|' 先水平后垂直，拐角在右上；'|-' 先垂直后水平，拐角在左下 */}
    <Draw
      way={[
        'A',
        { label: { text: "'-|' t=0.5 (corner)", position: 0.5 } },
        '-|',
        'B',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'A',
        { label: { text: "'|-' t=0.5 (corner)", position: 0.5, side: 'below' } },
        '|-',
        'B',
      ]}
      arrow="->"
      dashPattern={[3, 3]}
    />
  </Layout>
);

export default Demo;
