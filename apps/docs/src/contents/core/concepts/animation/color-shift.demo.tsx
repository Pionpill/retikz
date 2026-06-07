import { Layout, Node, colorShift } from '@retikz/react';
import type { FC } from 'react';

// 末帧 = base 色（#3b82f6），降级即见终态；动画从 #ef4444 渐变到它
const Demo: FC = () => (
  <Layout width={200} height={100}>
    <Node id="a" position={[0, 0]} fill="#3b82f6" animations={[colorShift({ from: '#ef4444', to: '#3b82f6' })]}>
      color
    </Node>
  </Layout>
);

export default Demo;
