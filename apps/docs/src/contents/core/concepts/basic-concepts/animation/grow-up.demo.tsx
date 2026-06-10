import { Layout, Node, growUp } from '@retikz/react';
import type { FC } from 'react';

// 柱状图入场：每根柱子 scaleY 0→1，支点底边（origin: 'south'）
const Demo: FC = () => (
  <Layout width={240} height={140}>
    <Node id="b1" position={[0, 0]} shape="rectangle" minimumWidth={28} minimumHeight={40} fill="#3b82f6" animations={[growUp()]} />
    <Node id="b2" position={[50, -20]} shape="rectangle" minimumWidth={28} minimumHeight={80} fill="#3b82f6" animations={[growUp()]} />
    <Node id="b3" position={[100, -10]} shape="rectangle" minimumWidth={28} minimumHeight={60} fill="#3b82f6" animations={[growUp()]} />
  </Layout>
);

export default Demo;
