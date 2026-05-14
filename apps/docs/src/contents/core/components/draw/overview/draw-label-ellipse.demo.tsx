import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={400} height={200}>
    <Node id="center" position={[200, 100]} stroke="none">·</Node>
    {/* ellipsePath：与 circlePath 同样角度参数化；rx≠ry 时 t=0.5 仍在 angle 180°（不是弧长中点） */}
    <Draw
      way={[
        'center',
        { label: { text: 't=0.25', position: 0.25, side: 'below' } },
        { ellipse: { radiusX: 170, radiusY: 70 } },
      ]}
    />
    <Draw
      way={[
        'center',
        { label: { text: 'midway (180°)', position: 'midway' } },
        { ellipse: { radiusX: 170, radiusY: 70 } },
      ]}
      dashPattern={[3, 3]}
    />
  </TikZ>
);

export default Demo;
