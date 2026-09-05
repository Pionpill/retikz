import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/**
 * screen 叠色（深底上提亮）
 * @description 深底矩形上叠两个圆，上层 blendMode="screen"——重叠处按 W3C screen 提亮。
 */
const Demo: FC = () => (
  <Layout width={260} height={200}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      style={{ fill: '#0f172a', stroke: 'none' }}
      layout={{ minimumSize: { width: 220, height: 160 } }}
    />
    <Node
      position={[-26, 0]}
      shape="circle"
      style={{ fill: '#f97316', stroke: 'none', blendMode: 'screen' }}
      layout={{ minimumSize: 100 }}
    />
    <Node
      position={[26, 0]}
      shape="circle"
      style={{ fill: '#06b6d4', stroke: 'none', blendMode: 'screen' }}
      layout={{ minimumSize: 100 }}
    />
  </Layout>
);

export default Demo;
