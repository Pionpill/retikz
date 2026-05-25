import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 自定义 viewBox 固定视框
 * @description 内容只有两个小圆，但显式 viewBox 定死 240×240 的视框（中心在原点）——内容不再撑满、四周留白由视框决定。
 *   有 viewBox 则覆盖自动算的 layout、忽略 padding。
 */
const Demo: FC = () => (
  <Layout width={220} height={220} viewBox={{ x: -120, y: -120, width: 240, height: 240 }}>
    <Node id="o" position={[0, 0]} shape="circle" minimumSize={44} fill="dodgerblue" textColor="white">
      0,0
    </Node>
    <Node id="c" position={[70, 70]} shape="circle" minimumSize={24} fill="orange" />
    <Node
      id="frame"
      position={[0, 0]}
      shape="rectangle"
      minimumWidth={236}
      minimumHeight={236}
      fill="none"
      stroke="lightgray"
      dashed
    />
  </Layout>
);

export default Demo;
