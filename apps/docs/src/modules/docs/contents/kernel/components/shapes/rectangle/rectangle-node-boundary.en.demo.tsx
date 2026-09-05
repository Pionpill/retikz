import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 矩形 Node 从内容内框到可连接边界的布局流程图 */
const Demo: FC = () => (
  <Layout width={420} height={350} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="text-size"
      position={[-115, -125]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      text measurement
    </Node>
    <Node
      id="padding"
      position={[115, -125]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 14 } }}
    >
      padding
    </Node>
    <Node
      id="inner-box"
      position={[0, -50]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14 } }}
    >
      inner content box
    </Node>
    <Node
      id="rectangle-shape"
      position={[0, 25]}
      text={['rectangle shape', '+ cornerRadius']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 14, weight: 'bold' } }}
    />
    <Node
      id="visible-outline"
      position={[-105, 130]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    >
      visible rectangle
    </Node>
    <Node
      id="connection-geometry"
      position={[105, 130]}
      text={['directional anchors', 'boundary intersection']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 14 } }}
    />

    <Draw way={['text-size', 'inner-box']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['padding', 'inner-box']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['inner-box', 'rectangle-shape']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'rectangle-shape',
        { label: { text: 'emit', side: 'bottom', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'visible-outline',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw
      way={[
        'rectangle-shape',
        { label: { text: 'resolve', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'connection-geometry',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
  </Layout>
);

export default Demo;
