import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * cycle 与 line / step 折角混用画一个矩形回路：A -> B (line) -> C (-|) ->
 * D (line) -> cycle 回 A。比手动 line 回起点少一个端点声明。
 */
const Demo: FC = () => (
  <Tikz width={360} height={180}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 0]}>
      B
    </Node>
    <Node id="c" position={[160, 100]}>
      C
    </Node>
    <Node id="d" position={[0, 100]}>
      D
    </Node>
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
      <Step kind="line" to="c" />
      <Step kind="line" to="d" />
      <Step kind="cycle" />
    </Path>
  </Tikz>
);

export default Demo;
