import type { FC } from 'react';

import { Layout, Path } from '@retikz/react';
import { RibbonPathKindDefinition } from '@retikz/standard/ribbon';

const Demo: FC = () => (
  <Layout
    width={560}
    height={240}
    viewBox={{ x: -280, y: -120, width: 560, height: 240 }}
    color="#172033"
    pathKinds={[RibbonPathKindDefinition]}
  >
    <Path
      kind="ribbon"
      kindOptions={{
        mode: 'boundary',
        upper: [
          { type: 'step', kind: 'move', to: [-220, -64] },
          {
            type: 'step',
            kind: 'cubic',
            control1: [-80, -96],
            control2: [92, -36],
            to: [220, -28],
          },
        ],
        lower: [
          { type: 'step', kind: 'move', to: [-220, -18] },
          {
            type: 'step',
            kind: 'cubic',
            control1: [-60, 16],
            control2: [92, 74],
            to: [220, 66],
          },
        ],
        sampling: { kind: 'fixed', samples: 80 },
      }}
      fill={{
        kind: 'linearGradient',
        angle: 0,
        stops: [
          { offset: 0, color: '#a78bfa' },
          { offset: 1, color: '#22d3ee' },
        ],
      }}
      fillOpacity={0.74}
      stroke="#172033"
      strokeWidth={1}
      strokeOpacity={0.18}
    />
  </Layout>
);

export default Demo;
