import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Step 没有 stroke 类视觉属性
 * @description 样式都挂在父 <Path> 上整条共享；5 条 Path 同结构仅 stroke / strokeWidth / dashPattern 不同。
 */
const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="r1" position={[0, 0]} stroke="none">
      默认
    </Node>
    <Node id="r2" position={[0, 30]} stroke="none">
      着色
    </Node>
    <Node id="r3" position={[0, 60]} stroke="none">
      加粗
    </Node>
    <Node id="r4" position={[0, 90]} stroke="none">
      虚线
    </Node>
    <Node id="r5" position={[0, 120]} stroke="none">
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
    <Path stroke="#10b981" strokeWidth={2} dashPattern={[6, 3]}>
      <Step kind="move" to="r4" />
      <Step kind="line" to={[320, 90]} />
    </Path>
    <Path stroke="#f97316" strokeWidth={2} dashPattern={[1, 4]}>
      <Step kind="move" to="r5" />
      <Step kind="line" to={[320, 120]} />
    </Path>
  </TikZ>
);

export default Demo;
