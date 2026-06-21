import { Draw, Layout, Node, Text } from '@retikz/react';
import type { FC } from 'react';

/**
 * 数据落地页 "数据流水线" 插图
 * @description 外部数据集在编译时进入数据层（字段模型 + 解析归一），整理成数据通道，再交给 mark / scale / 坐标系消费；数据行本身不进入 IR。
 */
const Demo: FC = () => (
  <Layout width={640} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ext" position={[-235, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>外部数据集</Text>
      <Text fill="gray" font={{ size: 12 }}>
        运行时传入
      </Text>
    </Node>
    <Node id="layer" position={[-80, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>数据层</Text>
      <Text fill="gray" font={{ size: 12 }}>
        字段模型 · 解析归一
      </Text>
    </Node>
    <Node id="channel" position={[90, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>数据通道</Text>
      <Text fill="gray" font={{ size: 12 }}>
        x / y / color / size
      </Text>
    </Node>
    <Node id="consume" position={[235, -16]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>消费</Text>
      <Text fill="gray" font={{ size: 12 }}>
        mark · scale · 坐标系
      </Text>
    </Node>

    <Draw way={['ext', 'layer']} arrow="->" />
    <Draw way={['layer', 'channel']} arrow="->" />
    <Draw way={['channel', 'consume']} arrow="->" />

    <Node id="note" position={[-80, 70]} stroke="none" align="center">
      <Text fill="gray" font={{ size: 12 }}>
        数据行不进 IR · 只有 model / format 随 spec 持久化
      </Text>
    </Node>
    <Draw way={['note', 'layer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
