import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Runtime flow where Plot enriches Data lineage with visual semantics */
const Demo: FC = () => (
  <Layout width={600} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="data"
      position={[-230, 0]}
      minimumSize={{ width: 116, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Data provenance</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Sources · transforms
      </Text>
    </Node>
    <Node
      id="plot"
      position={[-70, 0]}
      minimumSize={{ width: 160, height: 76 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Plot semantics</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Marks · encodings · scales
      </Text>
      <Text fill="gray" font={{ size: 12 }}>
        Layout · host metadata
      </Text>
    </Node>
    <Node
      id="run"
      position={[100, 0]}
      minimumSize={{ width: 145, height: 64 }}
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
      position={[240, 0]}
      minimumSize={{ width: 92, height: 64 }}
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
  </Layout>
);

export default Demo;
