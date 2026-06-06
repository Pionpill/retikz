import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 圆 / 椭圆节点
 * @description shape="circle" / "ellipse"：边界外接「文字 + padding」，可装文字、可被连线引用，端点自动贴边。
 */
const Demo: FC = () => (
  <Layout width={360} height={150}>
    <Node id="c" shape="circle" position={[-90, 0]} fill="aliceblue">
      circle
    </Node>
    <Node id="e" shape="ellipse" position={[90, 0]} fill="seashell">
      ellipse node
    </Node>
    <Draw way={['c', 'e']} arrow="->" />
  </Layout>
);

export default Demo;
