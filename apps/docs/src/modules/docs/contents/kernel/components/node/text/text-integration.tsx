import { Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/** 节点内一行 Text 与普通正文的最小组合 */
const TextIntegration: FC = () => (
  <Layout>
    <Node position={[0, 0]} layout={{ align: 'start' }}>
      <Text font={{ weight: 'bold' }}>A</Text>B
    </Node>
  </Layout>
);

export default TextIntegration;
