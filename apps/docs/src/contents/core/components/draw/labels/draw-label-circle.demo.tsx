import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={300}>
    <Node id="center" position={[150, 150]} stroke="none">·</Node>
    {/* circlePath：t=0 在 angle 0（+x），CCW 增长；0.25→90°(下) 0.5→180°(-x) 0.75→270°(上) */}
    <Draw
      way={[
        'center',
        { label: { text: 't=0.25', position: 0.25, side: 'below' } },
        { circle: { radius: 100 } },
      ]}
    />
    <Draw
      way={[
        'center',
        { label: { text: 'midway (180°)', position: 'midway' } },
        { circle: { radius: 100 } },
      ]}
      dashPattern={[3, 3]}
    />
  </TikZ>
);

export default Demo;
