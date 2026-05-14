import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="A" position={[40, 100]}>a</Node>
    <Node id="B" position={[380, 100]}>b</Node>
    {/* Bend：内部 lower 为 cubic，t 解释与 cubic 一致 */}
    <Draw
      way={[
        'A',
        { label: { text: 't=0.25', position: 0.25 } },
        { bend: 'left', angle: 45 },
        'B',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'A',
        { label: { text: 'midway', position: 'midway', side: 'above' } },
        { bend: 'left', angle: 45 },
        'B',
      ]}
      arrow="->"
      dashPattern="3 3"
    />
  </TikZ>
);

export default Demo;
