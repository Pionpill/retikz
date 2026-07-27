import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** normalize grouping, group sums, zero-sum protection, and row-preserving output */
const Demo: FC = () => (
  <Layout width={420} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
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
      <Text font={{ size: 14, weight: 'bold' }}>Detail rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[70, -70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Build group key</Text>
      <Text fill="gray" font={{ size: 12 }}>
        composite groupBy fields
      </Text>
    </Node>
    <Node
      id="sum"
      position={[70, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Sum each group</Text>
      <Text fill="gray" font={{ size: 12 }}>
        negative finite → error · non-finite → 0
      </Text>
    </Node>
    <Node
      id="negative"
      position={[-130, 0]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Negative finite value</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering throws
      </Text>
    </Node>
    <Node
      id="zero"
      position={[-130, 70]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Zero-sum guard</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sum = 0 emits 0
      </Text>
    </Node>
    <Node
      id="share"
      position={[70, 70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Compute each share</Text>
      <Text fill="gray" font={{ size: 12 }}>
        value / sum × scale
      </Text>
    </Node>
    <Node
      id="config"
      position={[-130, 140]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Output config</Text>
      <Text fill="gray" font={{ size: 12 }}>
        basis · as
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
      <Text font={{ size: 14, weight: 'bold' }}>Write share field</Text>
      <Text fill="gray" font={{ size: 12 }}>
        new or in-place · N → N
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'sum']} arrow="->" />
    <Draw way={['sum', 'share']} arrow="->" />
    <Draw way={['share', 'output']} arrow="->" />
    <Draw way={['sum', 'negative']} arrow="->" stroke="red" />
    <Draw way={['zero', 'share']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['config', 'share']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
