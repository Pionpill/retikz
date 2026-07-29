import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** jitter 的英文字段选择、确定性偏移与 pre-scale 数据流 */
const Demo: FC = () => (
  <Layout width={820} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-350, 40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Input rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="select"
      position={[-225, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Select target fields</Text>
      <Text fill="gray" font={{ size: 12 }}>
        axis · xField · yField
      </Text>
    </Node>
    <Node
      id="rng"
      position={[-40, -50]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>mulberry32(seed)</Text>
      <Text fill="gray" font={{ size: 12 }}>
        one u per target field
      </Text>
    </Node>
    <Node
      id="perturb"
      position={[-40, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data-space offset</Text>
      <Text fill="gray" font={{ size: 12 }}>
        δ = (2u − 1) × amount
      </Text>
    </Node>
    <Node
      id="output"
      position={[170, 40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Write next row</Text>
      <Text fill="gray" font={{ size: 12 }}>
        non-finite unchanged · N → N
      </Text>
    </Node>
    <Node
      id="scale"
      position={[350, 40]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Scale</Text>
      <Text fill="gray" font={{ size: 12 }}>
        data → screen
      </Text>
    </Node>

    <Draw way={['rows', 'select']} arrow="->" />
    <Draw way={['select', 'perturb']} arrow="->" />
    <Draw way={['rng', 'perturb']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['perturb', 'output']} arrow="->" />
    <Draw way={['output', 'scale']} arrow="->" />
  </Layout>
);

export default Demo;
