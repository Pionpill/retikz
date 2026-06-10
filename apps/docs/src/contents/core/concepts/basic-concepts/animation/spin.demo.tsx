import { Layout, Node, spin } from '@retikz/react';
import type { FC } from 'react';

// 旋转 loader：rotate 0→360 无限匀速，绕几何中心
const Demo: FC = () => (
  <Layout width={140} height={120}>
    <Node id="a" position={[0, 0]} shape="rectangle" minimumWidth={56} minimumHeight={16} fill="#6366f1" animations={[spin()]} />
  </Layout>
);

export default Demo;
