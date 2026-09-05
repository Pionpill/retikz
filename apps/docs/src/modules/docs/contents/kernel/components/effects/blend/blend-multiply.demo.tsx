import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * multiply 叠色
 * @description 三个重叠实心圆，上层 blendMode="multiply"——重叠处按 W3C multiply 压暗叠色。
 */
const Demo: FC = () => (
  <Layout width={260} height={200}>
    <Node
      position={[-26, -18]}
      shape="circle"
      style={{ fill: '#e11d48', stroke: 'none' }}
      layout={{ minimumSize: 90 }}
    />
    <Node
      position={[26, -18]}
      shape="circle"
      style={{ fill: '#22c55e', stroke: 'none', blendMode: 'multiply' }}
      layout={{ minimumSize: 90 }}
    />
    <Node
      position={[0, 28]}
      shape="circle"
      style={{ fill: '#3b82f6', stroke: 'none', blendMode: 'multiply' }}
      layout={{ minimumSize: 90 }}
    />
  </Layout>
);

export default Demo;
