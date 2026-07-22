import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** Independent Plot paths for lowered metadata and runtime lineage */
const Demo: FC = () => (
  <Layout width={720} height={290} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="lower-options"
      position={[-260, -65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Lowering provenance</Text>
      <Text fill="gray" font={{ size: 12 }}>
        provenance · datumIdField
      </Text>
    </Node>
    <Node
      id="lower"
      position={[0, -65]}
      minimumSize={{ width: 170, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Normal lowering</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Generate Core primitives
      </Text>
    </Node>
    <Node
      id="scene"
      position={[260, -65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Primitive ids / meta</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Used by Scene and locator
      </Text>
    </Node>

    <Node
      id="lineage-options"
      position={[-260, 65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Lineage options</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lineage · host metadata
      </Text>
    </Node>
    <Node
      id="record"
      position={[0, 65]}
      minimumSize={{ width: 170, height: 64 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Runtime recording</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Combine Data and Plot semantics
      </Text>
    </Node>
    <Node
      id="artifact"
      position={[260, 65]}
      minimumSize={{ width: 180, height: 64 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotLineageRun</Text>
      <Text fill="gray" font={{ size: 12 }}>
        Exposed only by return or callback
      </Text>
    </Node>

    <Draw way={['lower-options', 'lower']} arrow="->" stroke="gray" />
    <Draw way={['lower', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['lineage-options', 'record']} arrow="->" stroke="gray" />
    <Draw way={['record', 'artifact']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
