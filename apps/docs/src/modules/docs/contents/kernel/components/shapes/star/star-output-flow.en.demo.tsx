import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Star Sugar 与 Node shape 的几何消费路径 */
const Demo: FC = () => (
  <Layout width={430} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="sugar"
      position={[-135, -68]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      {'<Star> · −90°'}
    </Node>
    <Node
      id="node"
      position={[-135, 68]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      {'Node star · 0°'}
    </Node>
    <Node
      id="vertices"
      position={[-15, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      2p vertices
    </Node>
    <Node
      id="path"
      position={[140, -68]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      closed Path
    </Node>
    <Node
      id="boundary"
      position={[140, 68]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      boundary · anchors
    </Node>

    <Draw
      way={[
        'sugar',
        { label: { text: 'derive', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'vertices',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'node',
        { label: { text: 'derive', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'vertices',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'vertices',
        { label: { text: 'close', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'path',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'vertices',
        { label: { text: 'project', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
