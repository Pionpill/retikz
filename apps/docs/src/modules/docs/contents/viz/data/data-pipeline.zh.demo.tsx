import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 数据落地页 "数据流水线" 插图
 * @description 外部数据集在运行时进入数据层，经字段模型与解析归一形成规范化行，再交给不同消费模块
 */
const Demo: FC = () => (
  <Layout width={640} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ext" position={[-235, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>外部数据集</Text>
      <Text fill="gray" font={{ size: 12 }}>
        运行时传入
      </Text>
    </Node>
    <Node id="layer" position={[-80, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>数据层</Text>
      <Text fill="gray" font={{ size: 12 }}>
        字段模型 · 解析归一
      </Text>
    </Node>
    <Node id="channel" position={[90, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>规范化行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        逻辑字段 · 标准值
      </Text>
    </Node>
    <Node id="consume" position={[235, -16]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>消费</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Plot · Table · 其它模块
      </Text>
    </Node>

    <Draw way={['ext', 'layer']} arrow="->" />
    <Draw way={['layer', 'channel']} arrow="->" />
    <Draw way={['channel', 'consume']} arrow="->" />

    <Node id="note" position={[-80, 70]} stroke="none" align="middle">
      <Text fill="gray" font={{ size: 12 }}>
        数据行运行时传入 · 可序列化契约按需持久化
      </Text>
    </Node>
    <Draw way={['note', 'layer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
