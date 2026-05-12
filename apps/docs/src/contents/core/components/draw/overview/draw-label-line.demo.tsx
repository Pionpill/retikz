import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={420} height={140}>
    <Node id="A" position={[20, 60]}>a</Node>
    <Node id="B" position={[400, 60]}>b</Node>
    {/* 直线：t 即归一化弧长 */}
    <Draw
      way={['A', { label: { text: 't=0.25', position: 0.25 } }, 'B']}
      arrow="->"
    />
    <Draw
      way={[
        [20, 80],
        { label: { text: 'midway', position: 'midway', side: 'below' } },
        [400, 80],
      ]}
      arrow="->"
    />
    <Draw
      way={[
        [20, 100],
        { label: { text: 't=0.75', position: 0.75 } },
        [400, 100],
      ]}
      arrow="->"
    />
  </Tikz>
);

export default Demo;
