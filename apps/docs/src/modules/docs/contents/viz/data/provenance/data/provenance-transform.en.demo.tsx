import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Difference between row-preserving and row-changing provenance propagation */
const Demo: FC = () => (
  <Layout width={700} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="single-input"
      position={[-250, -45]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 150, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Source row #2</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDEX = 2
      </Text>
    </Node>
    <Node
      id="preserve"
      position={[0, -45]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 160, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Preserve one identity</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sort · select · annotate
      </Text>
    </Node>
    <Node
      id="single-output"
      position={[250, -45]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ minimumSize: { width: 150, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Detail output</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Still points to row #2
      </Text>
    </Node>

    <Node
      id="group-input"
      position={[-250, 45]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 150, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Rows #0 · #1 · #2</Text>
      <Text fill="gray" font={{ size: 12 }}>
        One group
      </Text>
    </Node>
    <Node
      id="merge"
      position={[0, 45]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 160, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Merge identities</Text>
      <Text fill="gray" font={{ size: 12 }}>
        summarize · custom aggregate
      </Text>
    </Node>
    <Node
      id="group-output"
      position={[250, 45]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ minimumSize: { width: 150, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Derived output</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDICES = [0, 1, 2]
      </Text>
    </Node>

    <Draw way={['single-input', 'preserve']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['preserve', 'single-output']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['group-input', 'merge']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['merge', 'group-output']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
