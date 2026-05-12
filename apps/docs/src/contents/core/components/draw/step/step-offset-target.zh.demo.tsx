import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * step.to 用 OffsetPosition
 * @description path 终点 = `{ of, offset }`，基准三态：节点 id（深）、笛卡尔字面值（中灰）、polar 表达式（浅灰）。Draw way item 直接接 OffsetPosition。
 */
const Demo: FC = () => (
  <Tikz width={420} height={200}>
    <Node id="A" position={[-140, 0]}>a</Node>
    <Draw way={['A', { of: 'A', offset: [120, -50] }]} arrow="->" />
    <Draw
      way={['A', { of: [120, 60], offset: [0, 0] }]}
      arrow="->"
      stroke="#888"
    />
    <Draw
      way={[
        'A',
        {
          of: { origin: 'A', angle: 0, radius: 160 },
          offset: [0, 50],
        },
      ]}
      arrow="->"
      stroke="#bbb"
    />
  </Tikz>
);

export default Demo;
