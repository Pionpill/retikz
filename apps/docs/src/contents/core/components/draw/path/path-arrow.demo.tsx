import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 三种箭头方向并列演示——`->`、`<-`、`<->`。箭头颜色由 `<defs>` 内 marker 的
 * `fill="context-stroke"` 自动随 Path 的 stroke 匹配；`markerUnits="strokeWidth"`
 * 让箭头大小随 strokeWidth 缩放。
 */
const Demo: FC = () => (
  <Tikz width={360} height={220}>
    <Node id="a1" position={[0, 0]}>
      A
    </Node>
    <Node id="b1" position={[160, 0]}>
      B
    </Node>
    <Node id="a2" position={[0, 60]}>
      A
    </Node>
    <Node id="b2" position={[160, 60]}>
      B
    </Node>
    <Node id="a3" position={[0, 120]}>
      A
    </Node>
    <Node id="b3" position={[160, 120]}>
      B
    </Node>

    {/* 终点箭头：A → B */}
    <Path arrow="->">
      <Step kind="move" to="a1" />
      <Step kind="line" to="b1" />
    </Path>
    {/* 起点箭头：B → A 视觉上 */}
    <Path arrow="<-">
      <Step kind="move" to="a2" />
      <Step kind="line" to="b2" />
    </Path>
    {/* 双向箭头 */}
    <Path arrow="<->" stroke="#3b82f6" strokeWidth={2}>
      <Step kind="move" to="a3" />
      <Step kind="line" to="b3" />
    </Path>
  </Tikz>
);

export default Demo;
