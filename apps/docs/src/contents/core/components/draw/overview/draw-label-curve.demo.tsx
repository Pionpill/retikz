import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="A" position={[40, 160]}>a</Node>
    <Node id="B" position={[380, 160]}>b</Node>
    {/* Quadratic Bezier：t 是 Bezier 参数（非弧长）；t=0.5 通常不是视觉中点 */}
    <Draw
      way={[
        'A',
        { label: { text: 't=0.25', position: 0.25 } },
        { curve: [210, 20] },
        'B',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'A',
        {
          label: {
            text: 'midway (Bezier t=0.5)',
            position: 'midway',
            side: 'below',
          },
        },
        { curve: [210, 20] },
        'B',
      ]}
      arrow="->"
      strokeDasharray="3 3"
    />
  </TikZ>
);

export default Demo;
