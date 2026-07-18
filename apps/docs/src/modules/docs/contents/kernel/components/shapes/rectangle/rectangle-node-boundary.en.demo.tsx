import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 矩形 Node 从内容内框到可连接边界的布局流程图 */
const Demo: FC = () => (
  <Layout width={420} height={350} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="text-size"
      position={[-115, -125]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      text measurement
    </Node>
    <Node
      id="padding"
      position={[115, -125]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      padding
    </Node>
    <Node
      id="inner-box"
      position={[0, -50]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      inner content box
    </Node>
    <Node
      id="rectangle-shape"
      position={[0, 25]}
      text={['rectangle shape', '+ cornerRadius']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    />
    <Node
      id="visible-outline"
      position={[-105, 130]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      visible rectangle
    </Node>
    <Node
      id="connection-geometry"
      position={[105, 130]}
      text={['directional anchors', 'boundary intersection']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    />

    <Draw way={['text-size', 'inner-box']} arrow="->" stroke="gray" />
    <Draw way={['padding', 'inner-box']} arrow="->" stroke="gray" />
    <Draw way={['inner-box', 'rectangle-shape']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'rectangle-shape',
        { label: { text: 'emit', side: 'bottom', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'visible-outline',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'rectangle-shape',
        { label: { text: 'resolve', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'connection-geometry',
      ]}
      arrow="->"
      stroke="gray"
    />
  </Layout>
);

export default Demo;
