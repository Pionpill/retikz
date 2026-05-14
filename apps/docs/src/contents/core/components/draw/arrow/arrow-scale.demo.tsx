import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 缩放：scale 等比放大 marker 尺寸；length / width 控具体维度
 * @description scale 乘到 length × width 之后（length=10, scale=1.5 → markerWidth 15）。三行对照：默认（scale 缺省）/ scale=1.5 / length=14, width=10
 */
const Demo: FC = () => (
  <TikZ width={320} height={140}>
    <Node id="a1" position={[0, 0]}>
      A
    </Node>
    <Node id="b1" position={[260, 0]}>
      B
    </Node>
    <Path arrow="->" strokeWidth={2}>
      <Step kind="move" to="a1" />
      <Step kind="line" to="b1" />
    </Path>
    <Node id="a2" position={[0, 45]}>
      A
    </Node>
    <Node id="b2" position={[260, 45]}>
      B
    </Node>
    <Path arrow="->" arrowDetail={{ scale: 1.5 }} strokeWidth={2}>
      <Step kind="move" to="a2" />
      <Step kind="line" to="b2" />
    </Path>
    <Node id="a3" position={[0, 90]}>
      A
    </Node>
    <Node id="b3" position={[260, 90]}>
      B
    </Node>
    <Path arrow="->" arrowDetail={{ length: 14, width: 10 }} strokeWidth={2}>
      <Step kind="move" to="a3" />
      <Step kind="line" to="b3" />
    </Path>
  </TikZ>
);

export default Demo;
