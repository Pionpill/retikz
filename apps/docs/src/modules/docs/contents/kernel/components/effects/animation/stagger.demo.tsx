import type { FC } from 'react';

import { fadeIn, stagger } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

// 错峰：3 个节点同样 fadeIn，依次延迟 0 / 150 / 300ms 入场
const [a, b, c] = stagger([fadeIn(), fadeIn(), fadeIn()], 150);

const Demo: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]} animations={[a]} style={{ fill: '#3b82f6' }}>
      1
    </Node>
    <Node id="b" position={[80, 0]} animations={[b]} style={{ fill: '#3b82f6' }}>
      2
    </Node>
    <Node id="c" position={[160, 0]} animations={[c]} style={{ fill: '#3b82f6' }}>
      3
    </Node>
  </Layout>
);

export default Demo;
