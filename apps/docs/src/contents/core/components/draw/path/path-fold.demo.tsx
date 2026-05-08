import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={360} height={240}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 80]}>
      B
    </Node>
    <Node id="c" position={[80, -60]}>
      C
    </Node>
    {/* 一条 path 混合 line + step：A -|→ B（折角）→ 直线到 C → |-→ A（折角闭回） */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="step" via="-|" to="b" />
      <Step kind="line" to="c" />
      <Step kind="step" via="|-" to="a" />
    </Path>
  </Tikz>
);

export default Demo;
