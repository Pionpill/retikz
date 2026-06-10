import { Layout, Node, colorShift } from '@retikz/react';
import type { FC } from 'react';

// colorShift 作用于 fill paint 通道：用纯形状节点（无文字 child），动画直接落到形状图元、其 fill 被覆盖。
// 末帧 = base 色（#3b82f6），降级即见终态；动画从 #ef4444 在 oklch 空间渐变到它。
const Demo: FC = () => (
  <Layout width={160} height={100}>
    <Node id="a" position={[0, 0]} shape="rectangle" minimumWidth={72} minimumHeight={48} fill="#3b82f6" animations={[colorShift({ from: '#ef4444', to: '#3b82f6' })]} />
  </Layout>
);

export default Demo;
