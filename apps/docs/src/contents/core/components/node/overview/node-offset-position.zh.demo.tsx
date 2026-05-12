import { Coordinate, Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `offset` 任意 (dx, dy) 偏移定位
 * @description position 接 `{ of, offset }`：of 三态——节点 id（A）/ 笛卡尔字面值（pin）/ 极坐标（半径 + 角度作基准）；offset 直接给 (dx, dy)，省去手算 atan2 / hypot
 */
const Demo: FC = () => (
  <Tikz width={460} height={260}>
    {/* of=id：相对节点 A 偏移 */}
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={{ of: 'A', offset: [120, 0] }}>右 120</Node>
    <Node id="C" position={{ of: 'A', offset: [60, 70] }}>右 60 下 70</Node>

    {/* of=笛卡尔：无需任何节点定义 */}
    <Coordinate id="pin" position={[-120, 70]} />
    <Node id="D" position={{ of: [-120, 70], offset: [0, 0] }} shape="circle">D</Node>

    {/* of=PolarPosition：在 A 的极坐标基准上再偏移 */}
    <Node
      id="E"
      shape="diamond"
      position={{
        of: { origin: 'A', angle: 90, radius: 80 },
        offset: [40, 10],
      }}
    >E</Node>

    <Draw way={['A', 'B']} arrow="->" />
    <Draw way={['A', 'C']} arrow="->" />
    <Draw way={['A', 'D']} arrow="->" />
    <Draw way={['A', 'E']} arrow="->" />
  </Tikz>
);

export default Demo;
