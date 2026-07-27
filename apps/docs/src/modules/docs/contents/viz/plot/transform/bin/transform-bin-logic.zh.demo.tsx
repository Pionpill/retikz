import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** bin 的边界解析、分桶、指标规约与每箱输出 */
const Demo: FC = () => (
  <Layout width={420} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[70, -140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>连续字段行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="strategy"
      position={[-130, -70]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>唯一分箱策略</Text>
      <Text fill="gray" font={{ size: 12 }}>
        count · step · thresholds
      </Text>
    </Node>
    <Node
      id="edges"
      position={[70, -70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>解析箱边</Text>
      <Text fill="gray" font={{ size: 12 }}>
        extent + strategy
      </Text>
    </Node>
    <Node
      id="error"
      position={[-130, 10]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>策略冲突</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering 抛错
      </Text>
    </Node>
    <Node
      id="buckets"
      position={[70, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>分配到半开区间</Text>
      <Text fill="gray" font={{ size: 12 }}>
        末箱包含上界
      </Text>
    </Node>
    <Node
      id="metrics"
      position={[70, 70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>运行 reducer</Text>
      <Text fill="gray" font={{ size: 12 }}>
        默认 count → binCount
      </Text>
    </Node>
    <Node
      id="output"
      position={[70, 140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出每箱一行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        箱边 · 中点 · metrics
      </Text>
    </Node>

    <Draw way={['rows', 'edges']} arrow="->" />
    <Draw way={['edges', 'buckets']} arrow="->" />
    <Draw way={['buckets', 'metrics']} arrow="->" />
    <Draw way={['metrics', 'output']} arrow="->" />
    <Draw way={['strategy', 'edges']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'strategy',
        {
          label: {
            text: '多个',
            position: 'midway',
            side: 'right',
            sloped: false,
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
