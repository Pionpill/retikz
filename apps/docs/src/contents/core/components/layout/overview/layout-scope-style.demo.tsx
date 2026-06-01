import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 全图默认样式：<Layout> 直接挂级联样式 props
 * @description 不再手写一层根 <Scope>——Layout 上的 stroke / nodeDefault / pathDefault 级联到所有子图元：
 *   三个节点共享圆形 + 灰描边 + 白底，两条连线共享线宽 / 圆端点 / 灰色。一处设默认、全图生效。
 */
const Demo: FC = () => (
  <Layout
    width={320}
    height={120}
    stroke="gray"
    nodeDefault={{ shape: 'circle', minimumSize: 34, fill: 'white' }}
    pathDefault={{ strokeWidth: 3, lineCap: 'round' }}
  >
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={[130, 0]}>B</Node>
    <Node id="C" position={[260, 0]}>C</Node>
    <Draw way={['A', 'B']} arrow="->" />
    <Draw way={['B', 'C']} arrow="->" />
  </Layout>
);

export default Demo;
