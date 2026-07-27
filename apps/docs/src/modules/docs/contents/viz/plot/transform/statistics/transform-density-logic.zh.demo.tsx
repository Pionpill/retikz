import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** density 的有限样本筛选、带宽解析、KDE 采样与输出 */
const Demo: FC = () => (
  <Layout width={440} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-70, -150]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>一维样本行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-70, -80]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>分组并筛有限值</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy · field
      </Text>
    </Node>
    <Node
      id="strategy"
      position={[120, -10]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>带宽策略</Text>
      <Text fill="gray" font={{ size: 12 }}>
        silverman 或显式 value
      </Text>
    </Node>
    <Node
      id="bandwidth"
      position={[-70, -10]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>解析正带宽</Text>
      <Text fill="gray" font={{ size: 12 }}>
        h &gt; 0
      </Text>
    </Node>
    <Node
      id="sampling"
      position={[120, 60]}
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
      id="kde"
      position={[-70, 60]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>逐点计算 Gaussian KDE</Text>
      <Text fill="gray" font={{ size: 12 }}>
        所有样本核函数的均值
      </Text>
    </Node>
    <Node
      id="error"
      position={[120, -80]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>样本或带宽无效</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering 抛错
      </Text>
    </Node>
    <Node
      id="output"
      position={[-70, 140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出密度采样行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        每组 sampleCount 行
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'bandwidth']} arrow="->" />
    <Draw way={['bandwidth', 'kde']} arrow="->" />
    <Draw way={['kde', 'output']} arrow="->" />
    <Draw way={['strategy', 'bandwidth']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['sampling', 'kde']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'bandwidth',
        {
          label: {
            text: '无效',
            position: 'midway',
            side: 'top',
            sloped: true,
            textColor: 'red',
            font: { size: 12 },
          },
        },
        'error',
      ]}
      arrow="->"
      stroke="red"
    />
  </Layout>
);

export default Demo;
