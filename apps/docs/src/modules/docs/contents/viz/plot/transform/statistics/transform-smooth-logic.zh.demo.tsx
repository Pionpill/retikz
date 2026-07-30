import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** smooth 的有限点筛选、OLS 拟合、区间采样与预测输出 */
const Demo: FC = () => (
  <Layout width={720} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-295, 20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>(x, y) 样本行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-160, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>分组并筛有限点</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy · x · y
      </Text>
    </Node>
    <Node
      id="method"
      position={[-10, -55]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>method</Text>
      <Text fill="gray" font={{ size: 12 }}>
        linear
      </Text>
    </Node>
    <Node
      id="fit"
      position={[-10, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>拟合 OLS 模型</Text>
      <Text fill="gray" font={{ size: 12 }}>
        intercept + slope × x
      </Text>
    </Node>
    <Node
      id="sampling"
      position={[140, -55]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>采样配置</Text>
      <Text fill="gray" font={{ size: 12 }}>
        extent · sampleCount
      </Text>
    </Node>
    <Node
      id="predict"
      position={[140, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>生成 x 并预测 y</Text>
      <Text fill="gray" font={{ size: 12 }}>
        等距采样
      </Text>
    </Node>
    <Node
      id="error"
      position={[-10, 95]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>无法拟合</Text>
      <Text fill="gray" font={{ size: 12 }}>
        点不足或 x 方差为 0
      </Text>
    </Node>
    <Node
      id="output"
      position={[290, 20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出趋势采样行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        每组 sampleCount 行
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'fit']} arrow="->" />
    <Draw way={['fit', 'predict']} arrow="->" />
    <Draw way={['predict', 'output']} arrow="->" />
    <Draw way={['method', 'fit']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['sampling', 'predict']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['fit', 'error']} arrow="->" stroke="red" />
  </Layout>
);

export default Demo;
