import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** bin edge resolution, bucketing, reducer metrics, and per-bin output */
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
      <Text font={{ size: 14, weight: 'bold' }}>Continuous rows</Text>
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
      <Text font={{ size: 14, weight: 'bold' }}>One bin strategy</Text>
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
      <Text font={{ size: 14, weight: 'bold' }}>Resolve bin edges</Text>
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
      <Text font={{ size: 14, weight: 'bold' }}>Strategy conflict</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering throws
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
      <Text font={{ size: 14, weight: 'bold' }}>Assign half-open bins</Text>
      <Text fill="gray" font={{ size: 12 }}>
        final bin includes max
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
      <Text font={{ size: 14, weight: 'bold' }}>Run reducers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        default count → binCount
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
      <Text font={{ size: 14, weight: 'bold' }}>Emit one row per bin</Text>
      <Text fill="gray" font={{ size: 12 }}>
        edges · midpoint · metrics
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
            text: 'multiple',
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
