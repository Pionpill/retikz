import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * arrow='->' 无 arrowDetail：默认 normal 实心三角，视觉随 path stroke 继承
 * @description 颜色由 marker 的 context-stroke 同步 path stroke；大小走 strokeWidth × 6 默认尺寸；不传 arrowDetail = 完全向后兼容 alpha.4 行为
 */
const Demo: FC = () => (
  <TikZ width={320} height={80}>
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
  </TikZ>
);

export default Demo;
