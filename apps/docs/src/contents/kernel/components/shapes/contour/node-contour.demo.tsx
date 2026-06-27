import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * contour 形状作为 Node（任意轮廓 + 自动居中）
 * @description shape={{ type:'contour', params:{ points, cornerRadius } }}：吃一圈任意闭合顶点环。
 *   两个节点用同一形状，但 points 在不同局部原点给出（右侧整体 +200 偏移）——core 按 points 的 AABB 中心
 *   自动居中，Node position 始终对齐几何中心，两者渲染完全一致。
 */
const FLAG: Array<[number, number]> = [
  [-30, 44],
  [30, 30],
  [30, -44],
  [-30, -44],
];

const Demo: FC = () => (
  <Layout width={400} height={190}>
    <Node
      position={[-90, 0]}
      shape={{ type: 'contour', params: { points: FLAG, cornerRadius: 8 } }}
      fill="steelblue"
    />
    <Node
      position={[90, 0]}
      shape={{
        type: 'contour',
        params: { points: FLAG.map(([x, y]): [number, number] => [x + 200, y + 200]), cornerRadius: 8 },
      }}
      fill="lightsteelblue"
    />
  </Layout>
);

export default Demo;
