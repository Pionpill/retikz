import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 数据落地页 "数据流水线" 插图（英文）
 * @description 外部数据集在编译时进入数据层（字段模型 + 解析归一），整理成数据通道，再交给 mark / scale / 坐标系消费；数据行本身不进入 IR。
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
      <Text font={{ size: 15, weight: 'bold' }}>Data channels</Text>
      <Text fill="gray" font={{ size: 12 }}>
        x / y / color / size
      </Text>
    </Node>
    <Node id="consume" position={[238, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Consumers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        mark · scale · coordinate
      </Text>
    </Node>

    <Draw way={['ext', 'layer']} arrow="->" />
    <Draw way={['layer', 'channel']} arrow="->" />
    <Draw way={['channel', 'consume']} arrow="->" />

    <Node id="note" position={[-78, 70]} stroke="none" align="middle">
      <Text fill="gray" font={{ size: 12 }}>
        Rows never enter IR — only model / format persist
      </Text>
    </Node>
    <Draw way={['note', 'layer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
