import { pulse } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** 展示动画工厂生成的节点轨道 */
const Entry: FC = () => (
  <Layout viewBox={{ x: -85, y: -65, width: 170, height: 130 }}>
    <Node
      id="pulse"
      shape="rectangle"
      layout={{ minimumSize: { width: 64, height: 44 } }}
      style={{ fill: '#dbeafe', stroke: '#2563eb' }}
      animations={[pulse({ peak: 1.25 })]}
    />
  </Layout>
);

export default Entry;
