import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Main flow that carries source identity through the Data pipeline */
const Demo: FC = () => (
  <Layout width={720} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="source"
      position={[-290, 0]}
      minimumSize={{ width: 112, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>External rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Source order
      </Text>
    </Node>
    <Node
      id="tag"
      position={[-145, 0]}
      minimumSize={{ width: 112, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Tag sources</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SOURCE_INDEX
      </Text>
    </Node>
    <Node
      id="canonical"
      position={[0, 0]}
      minimumSize={{ width: 112, height: 58 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Canonical rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Aligned fields
      </Text>
    </Node>
    <Node
      id="transform"
      position={[145, 0]}
      minimumSize={{ width: 112, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Transforms</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Preserve or merge
      </Text>
    </Node>
    <Node
      id="consumer"
      position={[290, 0]}
      minimumSize={{ width: 112, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Consumers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Rows + sources
      </Text>
    </Node>

    <Draw way={['source', 'tag']} arrow="->" stroke="gray" />
    <Draw way={['tag', 'canonical']} arrow="->" stroke="gray" />
    <Draw way={['canonical', 'transform']} arrow="->" stroke="gray" />
    <Draw way={['transform', 'consumer']} arrow="->" stroke="gray" />

    <Node position={[0, 76]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      Source identity is established before transforms; later stages only preserve, merge, or read it
    </Node>
  </Layout>
);

export default Demo;
