import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** jitter 的字段选择、确定性偏移与 pre-scale 数据流 */
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
      <Text font={{ size: 14, weight: 'bold' }}>输入行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="select"
      position={[70, -70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>选择目标字段</Text>
      <Text fill="gray" font={{ size: 12 }}>
        axis · xField · yField
      </Text>
    </Node>
    <Node
      id="rng"
      position={[-130, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>mulberry32(seed)</Text>
      <Text fill="gray" font={{ size: 12 }}>
        每个目标字段消耗一个 u
      </Text>
    </Node>
    <Node
      id="perturb"
      position={[70, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>数据空间偏移</Text>
      <Text fill="gray" font={{ size: 12 }}>
        δ = (2u − 1) × amount
      </Text>
    </Node>
    <Node
      id="output"
      position={[70, 70]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>写回新行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        非有限值原样保留 · N → N
      </Text>
    </Node>
    <Node
      id="scale"
      position={[70, 140]}
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
