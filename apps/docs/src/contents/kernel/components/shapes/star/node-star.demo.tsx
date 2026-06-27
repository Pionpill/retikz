import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 星形节点
 * @description shape={{ type:'star', params:{ points, innerRadius, outerRadius } }}：可连接的星形 glyph；端点贴 tip-N（第 N 尖角）。
 */
const Demo: FC = () => (
  <Layout width={360} height={170}>
    <Node id="hub" position={[-90, 0]}>
      hub
    </Node>
    <Node
      id="badge"
      position={[90, 0]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40 } }}
      fill="gold"
    />
    <Draw way={['hub', { id: 'badge', anchor: 'tip-0' }]} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
