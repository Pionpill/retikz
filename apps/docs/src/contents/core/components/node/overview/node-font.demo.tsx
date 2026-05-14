import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={460} height={80}>
    <Node id="bold" position={[-160, 0]} font={{ weight: 'bold' }}>
      Bold
    </Node>
    <Node id="italic" position={[-50, 0]} font={{ style: 'italic' }}>
      Italic
    </Node>
    <Node id="mono" position={[60, 0]} font={{ family: 'monospace' }}>
      mono()
    </Node>
    <Node id="big" position={[170, 0]} font={{ size: 18, weight: 600 }}>
      Big
    </Node>
  </TikZ>
);

export default Demo;
