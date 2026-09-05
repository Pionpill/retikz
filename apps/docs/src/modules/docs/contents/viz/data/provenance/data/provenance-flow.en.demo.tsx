import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Main flow that carries source identity through the Data pipeline */
const Demo: FC = () => (
  <Layout width={720} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="source"
      position={[-290, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>External rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Source order
      </Text>
    </Node>
    <Node
      id="tag"
      position={[-145, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Tag sources</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDEX
      </Text>
    </Node>
    <Node
      id="canonical"
      position={[0, 0]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Canonical rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Aligned fields
      </Text>
    </Node>
    <Node
      id="transform"
      position={[145, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Transforms</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Preserve or merge
      </Text>
    </Node>
    <Node
      id="consumer"
      position={[290, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.07 }}
      layout={{ minimumSize: { width: 112, height: 58 }, align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Consumers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Rows + sources
      </Text>
    </Node>

    <Draw way={['source', 'tag']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['tag', 'canonical']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['canonical', 'transform']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['transform', 'consumer']} arrow="->" style={{ stroke: 'gray' }} />

    <Node
      position={[0, 76]}
      style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}
      layout={{ padding: 0 }}
    >
      Source identity is established before transforms; later stages only preserve, merge, or read it
    </Node>
  </Layout>
);

export default Demo;
