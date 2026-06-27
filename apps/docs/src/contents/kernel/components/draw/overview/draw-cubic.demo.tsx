import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={160} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* 三次贝塞尔：infix 算子 { cubic: [c1, c2] }，两个控制点分别影响起末切线 */}
    <Draw way={['a', { cubic: [[60, -60], [140, 60]] }, 'b']} />
  </Layout>
);

export default Demo;
