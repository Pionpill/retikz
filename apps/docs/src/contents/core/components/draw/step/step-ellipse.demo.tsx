import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={280} height={200}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    {/* 横扁椭圆 */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step kind="ellipsePath" radiusX={100} radiusY={50} />
    </Path>
  </Tikz>
);

export default Demo;
