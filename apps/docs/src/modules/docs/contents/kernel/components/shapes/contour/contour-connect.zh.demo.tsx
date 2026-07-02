import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * 另一条 Path 连到 contour 节点（可连接性）
 * @description contour 仍是 Node——另一条线按 id 连到它时，boundaryPoint 给出射线 ∩ 轮廓的精确交点，
 *   连线端点落在轮廓边上（而非外接 AABB）。命名 / 标准方位 anchor 回退 AABB，boundaryPoint 始终精确。
 */
const FLAG: Array<[number, number]> = [
  [-34, 44],
  [34, 30],
  [34, -44],
  [-34, -44],
];

const Demo: FC = () => (
  <Layout width={400} height={190}>
    <Node id="src" position={[-130, 0]} fill="lightgray">
      起点
    </Node>
    <Node
      id="flag"
      position={[110, 0]}
      shape={{ type: 'contour', params: { points: FLAG, cornerRadius: 6 } }}
      fill="steelblue"
    />
    <Draw way={['src', 'flag']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
