import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * arrow='->' 无 arrowDetail：默认 stealth 倒钩三角，视觉继承路径描边
 * @description 颜色继承路径描边色；大小走 strokeWidth × 6 默认尺寸；不传 arrowDetail 时使用默认箭头外观
 */
const Demo: FC = () => (
  <Layout width={320} height={80} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[260, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" stroke="darkorange" strokeWidth={2} />
  </Layout>
);

export default Demo;
