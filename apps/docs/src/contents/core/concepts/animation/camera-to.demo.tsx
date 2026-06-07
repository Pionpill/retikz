import { Layout, Node, cameraTo } from '@retikz/react';
import type { FC } from 'react';

// 镜头：从全景 [0,0,200,200] 推到右下角 [110,110,80,80]（挂 Layout，scene 根 viewBox track）
const Demo: FC = () => (
  <Layout width={200} height={200} viewBox={{ x: 0, y: 0, width: 200, height: 200 }} animations={[cameraTo({ from: [0, 0, 200, 200], to: [110, 110, 80, 80] })]}>
    <Node id="a" position={[40, 40]} fill="#94a3b8">a</Node>
    <Node id="b" position={[150, 150]} fill="#3b82f6">b</Node>
  </Layout>
);

export default Demo;
