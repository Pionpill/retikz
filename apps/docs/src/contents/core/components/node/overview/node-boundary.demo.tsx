import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 连接面 boundary
 * @description 五角星 boundary="circle"：边默认贴外接圆（实线），端点 boundary="shape" 改贴真实尖端（虚线）。
 *   连接面只改"边在哪贴"，不改节点占位 / 视觉形状。
 */
const Demo: FC = () => (
  <Layout width={360} height={220}>
    <Node
      id="star"
      position={[0, 0]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 50 } }}
      boundary="circle"
      fill="gold"
    />
    <Node id="a" position={[-130, -70]} />
    <Node id="b" position={[130, -70]} />
    <Draw way={['a', 'star']} arrow="->" />
    <Draw way={['b', { id: 'star', boundary: 'shape' }]} arrow="->" dashPattern={[4, 2]} />
  </Layout>
);

export default Demo;
