import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * screen 叠色（深底上提亮）
 * @description 深底矩形上叠两个圆，上层 blendMode="screen"——重叠处按 W3C screen 提亮。
 */
const Demo: FC = () => (
  <Layout width={260} height={200}>
    <Node position={[0, 0]} shape="rectangle" fill="#0f172a" minimumSize={{ width: 220, height: 160 }} stroke="none" />
    <Node position={[-26, 0]} shape="circle" fill="#f97316" minimumSize={100} stroke="none" blendMode="screen" />
    <Node position={[26, 0]} shape="circle" fill="#06b6d4" minimumSize={100} stroke="none" blendMode="screen" />
  </Layout>
);

export default Demo;
