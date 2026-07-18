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
      文字测量
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
      内容内框
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
      可见矩形轮廓
    </Node>
    <Node
      id="connection-geometry"
      position={[105, 130]}
      text={['方位 anchor', '边界交点']}
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
        { label: { text: '绘制', side: 'bottom', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'visible-outline',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'rectangle-shape',
        { label: { text: '求交', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'connection-geometry',
      ]}
      arrow="->"
      stroke="gray"
    />
  </Layout>
);

export default Demo;
