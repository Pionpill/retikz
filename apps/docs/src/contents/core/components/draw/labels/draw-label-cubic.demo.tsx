import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="A" position={[40, 160]}>a</Node>
    <Node id="B" position={[380, 160]}>b</Node>
    {/* Cubic Bezier：t 是 Bezier 参数；对称 S-curve 上演示三档 */}
    <Draw
      way={[
        'A',
        { label: { text: 't=0.25', position: 0.25 } },
        { cubic: [[150, 20], [270, 20]] },
        'B',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'A',
        { label: { text: 'midway', position: 'midway', side: 'below' } },
        { cubic: [[150, 20], [270, 20]] },
        'B',
      ]}
      arrow="->"
      dashPattern={[3, 3]}
    />
  </TikZ>
);

export default Demo;
