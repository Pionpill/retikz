import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * step.to 用 OffsetPosition：路径终点 = 基准 + (dx, dy)
 * @description 三条 path 分别演示 of 的三态：id 引用节点（B 终点 = A + (60, 0)）、笛卡尔字面值（B 终点 = (60, 50) + (0, 0)）、极坐标基准（B 终点 = polar(A,0,60) + (0, 30)）；省 calc 二次手算
 */
const Demo: FC = () => (
  <Tikz width={500} height={260}>
    <Node id="A" position={[-160, 30]}>A</Node>

    {/* of=id：path 终止于 A + (60, 0) */}
    <Path arrow="->" stroke="steelblue">
      <Step kind="move" to="A" />
      <Step kind="line" to={{ of: 'A', offset: [60, 0] }} label={{ text: 'id+offset', side: 'above' }} />
    </Path>

    {/* of=笛卡尔字面值：终点 = (60, 50) */}
    <Path arrow="->" stroke="forestgreen">
      <Step kind="move" to="A" />
      <Step
        kind="line"
        to={{ of: [60, 50], offset: [0, 0] }}
        label={{ text: 'cartesian+offset', side: 'below' }}
      />
    </Path>

    {/* of=PolarPosition：基准 = polar(A, 0, 100)，再 + (0, 60) */}
    <Path arrow="->" stroke="crimson">
      <Step kind="move" to="A" />
      <Step
        kind="line"
        to={{
          of: { origin: 'A', angle: 0, radius: 100 },
          offset: [0, 60],
        }}
        label={{ text: 'polar+offset', side: 'sloped' }}
      />
    </Path>
  </Tikz>
);

export default Demo;
