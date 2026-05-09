import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={320} height={160}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* 三次贝塞尔：两个控制点分别影响起末切线，常用于 S 形曲线 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step
        kind="cubic"
        to="b"
        control1={[60, -60]}
        control2={[140, 60]}
      />
    </Path>
  </Tikz>
);

export default Demo;
