import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 扇形 / 弧 节点
 * @description shape={{ type:'sector'|'arc', params }}：尺寸由半径 / 角度定、不依赖文本，端点贴各自几何 anchor。
 */
const Demo: FC = () => (
  <Layout width={380} height={210}>
    <Node id="hub" position={[0, 0]} fill="lightgray">
      hub
    </Node>
    <Node
      id="wedge"
      position={[-130, -55]}
      shape={{ type: 'sector', params: { innerRadius: 16, outerRadius: 48, startAngle: 0, endAngle: 110 } }}
      fill="darkorange"
    />
    <Node
      id="ring"
      position={[130, -55]}
      shape={{ type: 'sector', params: { innerRadius: 30, outerRadius: 50, startAngle: 20, endAngle: 160 } }}
      fill="gold"
    />
    <Node
      id="curve"
      position={[0, 80]}
      shape={{ type: 'arc', params: { radius: 46, startAngle: 20, endAngle: 160 } }}
    />
    <Draw way={[{ id: 'wedge', anchor: 'outer-arc-mid' }, 'hub']} arrow="->" stroke="gray" />
    <Draw way={[{ id: 'ring', anchor: 'inner-arc-mid' }, 'hub']} arrow="->" stroke="gray" />
    <Draw way={['hub', { id: 'curve', anchor: 'arc-mid' }]} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
