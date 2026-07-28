import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 保行变换与改行变换传播来源的差异 */
const Demo: FC = () => (
  <Layout width={700} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="single-input"
      position={[-250, -45]}
      minimumSize={{ width: 150, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>来源行 #2</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDEX = 2
      </Text>
    </Node>
    <Node
      id="preserve"
      position={[0, -45]}
      minimumSize={{ width: 160, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>保留一行身份</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sort · select · annotate
      </Text>
    </Node>
    <Node
      id="single-output"
      position={[250, -45]}
      minimumSize={{ width: 150, height: 58 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出明细行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        仍回指来源 #2
      </Text>
    </Node>

    <Node
      id="group-input"
      position={[-250, 45]}
      minimumSize={{ width: 150, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>来源行 #0 · #1 · #2</Text>
      <Text fill="gray" font={{ size: 12 }}>
        一个分组
      </Text>
    </Node>
    <Node
      id="merge"
      position={[0, 45]}
      minimumSize={{ width: 160, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>合并多行身份</Text>
      <Text fill="gray" font={{ size: 12 }}>
        summarize · 自定义聚合
      </Text>
    </Node>
    <Node
      id="group-output"
      position={[250, 45]}
      minimumSize={{ width: 150, height: 58 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出派生行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDICES = [0, 1, 2]
      </Text>
    </Node>

    <Draw way={['single-input', 'preserve']} arrow="->" stroke="gray" />
    <Draw way={['preserve', 'single-output']} arrow="->" stroke="gray" />
    <Draw way={['group-input', 'merge']} arrow="->" stroke="gray" />
    <Draw way={['merge', 'group-output']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
