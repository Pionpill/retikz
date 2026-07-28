import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Data 来源追溯的行级元数据与运行时事件两类产物 */
const Demo: FC = () => (
  <Layout width={700} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="pipeline"
      position={[-255, 0]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data 管线</Text>
      <Text fill="gray" font={{ size: 12 }}>
        数据行 + transform
      </Text>
    </Node>
    <Node
      id="row"
      position={[10, -65]}
      minimumSize={{ width: 210, height: 72 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>行级来源元数据</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Symbol：单行或来源集合
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        随行传播，不进入 JSON
      </Text>
    </Node>
    <Node
      id="events"
      position={[10, 65]}
      minimumSize={{ width: 210, height: 72 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>运行时链路事件</Text>
      <Text fill="gray" font={{ size: 12 }}>
        阶段 · 字段流 · 算子 · 样本
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        按需返回或流式发送
      </Text>
    </Node>
    <Node
      id="consume"
      position={[280, 0]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>不同用途</Text>
      <Text fill="gray" font={{ size: 12 }}>
        回指数据 · 审计计算
      </Text>
    </Node>

    <Draw way={['pipeline', 'row']} arrow="->" stroke="gray" />
    <Draw way={['pipeline', 'events']} arrow="->" stroke="gray" />
    <Draw way={['row', 'consume']} arrow="->" stroke="gray" />
    <Draw way={['events', 'consume']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
