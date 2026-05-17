import { Node, Path, Scope, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope rotate 下 AtPosition 跨 scope referent：right 方向跟着 scope rotate 旋转
 * @description A 在 scope 外；scope rotate 90 度内的 B 用 { direction:'right', of:'A', distance:60 }——
 *   relative right 在 scope 局部 = +x 方向；scope rotate 90 后视觉变 down——B 视觉落在 A 下方 60；
 *   左侧 ref-B 同样 AtPosition 但 scope 外（无 rotate）→ B 在 A 右侧。
 */
const Demo: FC = () => (
  <TikZ width={400} height={200}>
    <Node id="A" position={[0, 0]} shape="circle" padding={4}>A</Node>
    <Scope transforms={[{ kind: 'rotate', degrees: 90 }]}>
      <Node id="B" position={{ direction: 'right', of: 'A', distance: 60 }} shape="circle" padding={4}>B</Node>
    </Scope>
    <Node id="B-ref" position={{ direction: 'right', of: 'A', distance: 60 }} shape="circle" padding={4} stroke="gray">B-ref</Node>
    <Path arrow="->" stroke="gray" dashPattern={[4, 2]}>
      <Step kind="move" to="A" />
      <Step to="B" />
    </Path>
    <Path arrow="->" stroke="gray" dashPattern={[4, 2]}>
      <Step kind="move" to="A" />
      <Step to="B-ref" />
    </Path>
  </TikZ>
);

export default Demo;
