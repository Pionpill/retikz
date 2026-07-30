import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Boundary where Data provenance artifacts enter different hosts */
const Demo: FC = () => (
  <Layout width={700} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-225, 0]}
      minimumSize={{ width: 190, height: 82 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data output boundary</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Canonical rows
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        Provenance metadata · lineage events
      </Text>
    </Node>
    <Node
      id="plot"
      position={[115, -82]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Plot lineage (example host)
      </Text>
    </Node>
    <Node
      id="table"
      position={[115, 0]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Table</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Summary sources and trace-back
      </Text>
    </Node>
    <Node
      id="other"
      position={[115, 82]}
      minimumSize={{ width: 176, height: 58 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Other hosts</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Consume sources by their contracts
      </Text>
    </Node>

    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['data', 'table']} arrow="->" stroke="gray" />
    <Draw way={['data', 'other']} arrow="->" stroke="gray" />

    <Node position={[284, 0]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      Presentation and interaction semantics belong to each host
    </Node>
  </Layout>
);

export default Demo;
