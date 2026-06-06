import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 端点 boundary：单边覆盖
 * @description 同一五角星目标（节点未设 boundary，默认走视觉形状）；两条边各自在端点选连接面——
 *   实线默认贴真实尖端、虚线 `boundary: 'circle'` 改贴外接圆。连接面由"边"决定，互不影响、也不改节点占位。
 */
const Demo: FC = () => (
  <Layout width={360} height={220}>
    <Node
      id="star"
      position={[0, 0]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 50 } }}
      fill="gold"
    />
    <Node id="a" position={[-130, 80]} />
    <Node id="b" position={[130, 80]} />
    <Draw way={['a', 'star']} arrow="->" />
    <Draw way={['b', { id: 'star', boundary: 'circle' }]} arrow="->" dashPattern={[4, 2]} />
  </Layout>
);

export default Demo;
