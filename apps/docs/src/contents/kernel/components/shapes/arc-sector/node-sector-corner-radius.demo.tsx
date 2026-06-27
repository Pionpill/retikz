import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 扇形节点圆角（环楔四角，连接感知）
 * @description shape params.cornerRadius 给环楔的直边↔弧接缝倒角；朝外弧方向的连线端点贴 fillet 后的轮廓。
 */
const Demo: FC = () => (
  <Layout width={360} height={200}>
    <Node id="hub" position={[0, 70]} fill="lightgray">
      hub
    </Node>
    <Node
      id="wedge"
      position={[0, -50]}
      shape={{
        type: 'sector',
        params: { innerRadius: 22, outerRadius: 58, startAngle: 200, endAngle: 340, cornerRadius: 6 },
      }}
      fill="darkorange"
    />
    <Draw way={['hub', { id: 'wedge', anchor: 'outer-arc-mid' }]} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
