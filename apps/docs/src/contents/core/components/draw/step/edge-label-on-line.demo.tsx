import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={420} height={140}>
    <Node id="a" position={[20, 60]}>
      A
    </Node>
    <Node id="b" position={[400, 60]}>
      B
    </Node>
    {/* 直线：t 即归一化弧长，3 组数值 + 1 组 keyword */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step kind="line" to="b" label={{ text: 't=0.25', position: 0.25 }} />
    </Path>
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to={[20, 80]} />
      <Step kind="line" to={[400, 80]} label={{ text: 'midway', position: 'midway', side: 'below' }} />
    </Path>
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to={[20, 100]} />
      <Step kind="line" to={[400, 100]} label={{ text: 't=0.75', position: 0.75 }} />
    </Path>
  </Tikz>
);

export default Demo;
