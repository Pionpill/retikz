import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Runtime flow where Plot enriches Data lineage with visual semantics */
const Demo: FC = () => (
  <Layout width={720} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-270, 0]}
      minimumSize={{ width: 146, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data lineage</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Sources · transforms
      </Text>
    </Node>
    <Node
      id="plot"
      position={[-55, 0]}
      minimumSize={{ width: 180, height: 76 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot enrichment</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Marks · encodings · scales
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        Layout · host metadata
      </Text>
    </Node>
    <Node
      id="run"
      position={[165, 0]}
      minimumSize={{ width: 150, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Runtime artifact
      </Text>
    </Node>
    <Node
      id="tools"
      position={[320, 0]}
      minimumSize={{ width: 105, height: 64 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Host tools</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Audit · locate
      </Text>
    </Node>

    <Draw way={['data', 'plot']} arrow="->" stroke="gray" />
    <Draw way={['plot', 'run']} arrow="->" stroke="gray" />
    <Draw way={['run', 'tools']} arrow="->" stroke="gray" />

    <Node position={[15, 78]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      Plot reads Data sources but owns mark, scale, and layout semantics
    </Node>
  </Layout>
);

export default Demo;
