import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Row metadata and runtime events produced by Data provenance */
const Demo: FC = () => (
  <Layout width={700} height={270} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="pipeline"
      position={[-255, 0]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data pipeline</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Rows + transforms
      </Text>
    </Node>
    <Node
      id="row"
      position={[10, -65]}
      minimumSize={{ width: 210, height: 72 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Row provenance metadata</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Symbols: one row or a source set
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        Travels with rows, excluded from JSON
      </Text>
    </Node>
    <Node
      id="events"
      position={[10, 65]}
      minimumSize={{ width: 210, height: 72 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Runtime lineage events</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Steps · fields · operators · samples
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        Returned or streamed on demand
      </Text>
    </Node>
    <Node
      id="consume"
      position={[280, 0]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Separate jobs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Trace rows · audit work
      </Text>
    </Node>

    <Draw way={['pipeline', 'row']} arrow="->" stroke="gray" />
    <Draw way={['pipeline', 'events']} arrow="->" stroke="gray" />
    <Draw way={['row', 'consume']} arrow="->" stroke="gray" />
    <Draw way={['events', 'consume']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
