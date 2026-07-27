import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** stack grouping, ordering, bound calculation, and row-preserving output */
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
      <Text font={{ size: 14, weight: 'bold' }}>Group by x</Text>
      <Text fill="gray" font={{ size: 12 }}>
        one group when omitted
      </Text>
    </Node>
    <Node
      id="order"
      position={[70, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Order series</Text>
      <Text fill="gray" font={{ size: 12 }}>
        first groupBy appearance
      </Text>
    </Node>
    <Node
      id="offset"
      position={[-130, 70]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>offset strategy</Text>
      <Text fill="gray" font={{ size: 12 }}>
        non-negative / signed → diverging
      </Text>
    </Node>
    <Node
      id="bounds"
      position={[70, 70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Compute bounds</Text>
      <Text fill="gray" font={{ size: 12 }}>
        non-finite y becomes 0
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
      <Text font={{ size: 14, weight: 'bold' }}>Write y0 / y1</Text>
      <Text fill="gray" font={{ size: 12 }}>
        original order · N → N
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'order']} arrow="->" />
    <Draw way={['order', 'bounds']} arrow="->" />
    <Draw way={['bounds', 'output']} arrow="->" />
    <Draw way={['offset', 'bounds']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
