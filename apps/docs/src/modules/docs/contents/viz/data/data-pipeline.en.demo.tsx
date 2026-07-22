import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 数据落地页 "数据流水线" 插图（英文）
 * @description External datasets enter the data layer at runtime, become canonical rows, and then flow to independent consumer modules
 */
const Demo: FC = () => (
  <Layout width={640} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ext" position={[-245, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>External dataset</Text>
      <Text fill="gray" font={{ size: 12 }}>
        passed at runtime
      </Text>
    </Node>
    <Node id="layer" position={[-78, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Data layer</Text>
      <Text fill="gray" font={{ size: 12 }}>
        model · normalize
      </Text>
    </Node>
    <Node id="channel" position={[92, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Canonical rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        logical fields · values
      </Text>
    </Node>
    <Node id="consume" position={[238, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Consumers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Plot · Table · other modules
      </Text>
    </Node>

    <Draw way={['ext', 'layer']} arrow="->" />
    <Draw way={['layer', 'channel']} arrow="->" />
    <Draw way={['channel', 'consume']} arrow="->" />

    <Node id="note" position={[-78, 70]} stroke="none" align="middle">
      <Text fill="gray" font={{ size: 12 }}>
        Rows arrive at runtime · contracts may persist
      </Text>
    </Node>
    <Draw way={['note', 'layer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
