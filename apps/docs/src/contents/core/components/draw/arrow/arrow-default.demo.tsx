import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * arrow='->' 无 arrowDetail：默认 stealth 倒钩三角，视觉继承路径描边
 * @description 颜色继承路径描边色；大小走 strokeWidth × 6 默认尺寸；不传 arrowDetail 时使用默认箭头外观
 */
const Demo: FC = () => (
  <Layout width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[260, 0]}>
      B
    </Node>
    <Path arrow="->" stroke="#3b82f6" strokeWidth={2}>
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
