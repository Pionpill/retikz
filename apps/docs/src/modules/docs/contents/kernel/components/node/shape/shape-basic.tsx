import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** 最小圆形节点示例 */
const ShapeBasic: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]} shape="circle">
      Hello
    </Node>
  </Layout>
);
export default ShapeBasic;
