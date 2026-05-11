import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * `kind="cycle"` 闭合到 path 起点
 * @description 等价 SVG 'Z'，三角形写完 3 条边后直接 cycle 一次结束，不用手动 line 回 A。
 */
const Demo: FC = () => (
  <Tikz width={320} height={200}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 0]}>
      B
    </Node>
    <Node id="c" position={[80, 120]}>
      C
    </Node>
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
      <Step kind="line" to="c" />
      <Step kind="cycle" />
    </Path>
  </Tikz>
);

export default Demo;
