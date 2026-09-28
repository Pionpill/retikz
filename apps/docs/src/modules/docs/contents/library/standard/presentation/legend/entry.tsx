import { Layout, Node } from '@retikz/react';
import { Legend, LegendItem } from '@retikz/standard-react/presentation';
import type { FC } from 'react';
/** 单条样本与标签的最小图例 */
const Demo: FC = () => (
  <Layout>
    <Legend kind="items">
      <LegendItem itemKey="a" sample={<Node position={[0, 0]} text="●" />}>
        <Node position={[0, 0]} text="A" />
      </LegendItem>
    </Legend>
  </Layout>
);
export default Demo;
