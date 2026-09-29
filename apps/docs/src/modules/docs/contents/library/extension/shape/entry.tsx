import { CrossShapeDefinition } from '@retikz/extension';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** 展示 Extension 形状的最小接入结果 */
const Entry: FC = () => (
  <Layout extensions={{ shapes: [CrossShapeDefinition] }}>
    <Node
      shape="cross"
      layout={{ minimumSize: { width: 80, height: 80 } }}
      style={{ fill: '#dbeafe', stroke: '#2563eb' }}
    />
  </Layout>
);

export default Entry;
