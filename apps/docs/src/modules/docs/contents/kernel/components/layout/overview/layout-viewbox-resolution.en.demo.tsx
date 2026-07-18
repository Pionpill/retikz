import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Layout 视框与页面尺寸的决策图 */
const Demo: FC = () => (
  <Layout width={560} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="prop-viewbox"
      position={[-190, -55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      viewBox prop
    </Node>
    <Node
      id="ir-viewbox"
      position={[-190, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      IR.viewBox
    </Node>
    <Node
      id="auto-bounds"
      position={[-190, 55]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      bounds + padding
    </Node>
    <Node
      id="scene-layout"
      position={[0, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      Scene layout
    </Node>
    <Node
      id="coordinate-range"
      position={[195, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      internal coordinates
    </Node>
    <Node
      id="width-height"
      position={[0, 95]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      width / height
    </Node>
    <Node
      id="display-size"
      position={[195, 95]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      CSS display size
    </Node>

    <Draw
      way={[
        'prop-viewbox',
        { label: { text: 'priority 1', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene-layout',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'ir-viewbox',
        { label: { text: 'priority 2', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene-layout',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'auto-bounds',
        { label: { text: 'fallback', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene-layout',
      ]}
      arrow="->"
    />
    <Draw way={['scene-layout', 'coordinate-range']} arrow="->" />
    <Draw way={['width-height', 'display-size']} arrow="->" />
  </Layout>
);

export default Demo;
