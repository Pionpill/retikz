import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Step 自身没有 stroke 类视觉属性——样式都挂在父 <Path> 上，整条 Path 的所有 Step 共享。
 * 下面 5 条 Path 同结构（move + line），仅 Path 上的 stroke / strokeWidth / strokeDasharray 不同。
 */
const Demo: FC = () => (
  <Tikz width={420} height={200}>
    <Node id="r1" position={[0, 0]}>
      默认
    </Node>
    <Node id="r2" position={[0, 30]}>
      着色
    </Node>
    <Node id="r3" position={[0, 60]}>
      加粗
    </Node>
    <Node id="r4" position={[0, 90]}>
      虚线
    </Node>
    <Node id="r5" position={[0, 120]}>
      点线
    </Node>

    <Path>
      <Step kind="move" to="r1" />
      <Step kind="line" to={[320, 0]} />
    </Path>
    <Path stroke="#3b82f6" strokeWidth={2}>
      <Step kind="move" to="r2" />
      <Step kind="line" to={[320, 30]} />
    </Path>
    <Path strokeWidth={4}>
      <Step kind="move" to="r3" />
      <Step kind="line" to={[320, 60]} />
    </Path>
    <Path stroke="#10b981" strokeWidth={2} strokeDasharray="6 3">
      <Step kind="move" to="r4" />
      <Step kind="line" to={[320, 90]} />
    </Path>
    <Path stroke="#f97316" strokeWidth={2} strokeDasharray="1 4">
      <Step kind="move" to="r5" />
      <Step kind="line" to={[320, 120]} />
    </Path>
  </Tikz>
);

export default Demo;
