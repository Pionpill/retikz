import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 数据模型从外部行到下游消费者的整体流程 */
const Demo: FC = () => (
  <Layout width={700} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-245, 25]}
      minimumSize={{ width: 120, height: 58 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>外部数据行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        接口 · 文件 · 数据库
      </Text>
    </Node>
    <Node
      id="canonical"
      position={[-25, 25]}
      minimumSize={{ width: 126, height: 58 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>规范化行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        逻辑字段 + 标准值
      </Text>
    </Node>
    <Node
      id="consumers"
      position={[225, 25]}
      minimumSize={{ width: 164, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>后续处理</Text>
      <Text fill="gray" font={{ size: 12 }}>
        数据变换 · 消费模块
      </Text>
    </Node>
    <Node
      id="contract"
      position={[-25, -70]}
      minimumSize={{ width: 150, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>字段契约</Text>
      <Text fill="gray" font={{ size: 12 }}>
        类型 · 格式 · 顺序
      </Text>
    </Node>

    <Draw
      way={[
        'rows',
        {
          label: {
            text: '解析',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'canonical',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'canonical',
        {
          label: {
            text: '消费',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'consumers',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'contract',
        {
          label: {
            text: '约束',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'canonical',
      ]}
      arrow="->"
      stroke="darkorange"
      dashPattern={[4, 3]}
    />
  </Layout>
);

export default Demo;
