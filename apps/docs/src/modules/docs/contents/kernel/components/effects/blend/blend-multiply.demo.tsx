import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * multiply 叠色
 * @description 三个重叠实心圆，上层 blendMode="multiply"——重叠处按 W3C multiply 压暗叠色。
 */
const Demo: FC = () => (
  <Layout width={260} height={200}>
    <Node position={[-26, -18]} shape="circle" fill="#e11d48" minimumSize={90} stroke="none" />
    <Node position={[26, -18]} shape="circle" fill="#22c55e" minimumSize={90} stroke="none" blendMode="multiply" />
    <Node position={[0, 28]} shape="circle" fill="#3b82f6" minimumSize={90} stroke="none" blendMode="multiply" />
  </Layout>
);

export default Demo;
