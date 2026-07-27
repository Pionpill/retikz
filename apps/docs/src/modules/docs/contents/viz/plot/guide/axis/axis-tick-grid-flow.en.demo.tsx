import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Axis tick and major / minor grid position-source flow */
const Demo: FC = () => (
  <Layout width={760} height={225} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="axis-tick-group">
      <LogicFrameTitle>Axis tick</LogicFrameTitle>
      <Node
        id="axis-source"
        position={[-280, -55]}
        minimumSize={{ width: 176, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Axis tick source</Text>
        <Text fill="gray" font={{ size: 12 }}>
          values &gt; interval &gt; count
        </Text>
      </Node>
      <Node
        id="axis-candidates"
        position={[-75, -55]}
        minimumSize={{ width: 154, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Candidate ticks</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Positions inside the scale domain
        </Text>
      </Node>
      <Node
        id="axis-visible"
        position={[110, -55]}
        minimumSize={{ width: 146, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Visible ticks</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Sampled by ticks.density
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="grid-group">
      <LogicFrameTitle>Grid</LogicFrameTitle>
      <Node
        id="grid-source"
        position={[285, -55]}
        minimumSize={{ width: 154, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Major-grid source</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Reuse or grid.ticks
        </Text>
      </Node>
      <Node
        id="grid-visible"
        position={[475, -55]}
        minimumSize={{ width: 154, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Major-grid positions</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Optional grid.density
        </Text>
      </Node>
      <Node
        id="minor-source"
        position={[285, 20]}
        minimumSize={{ width: 154, height: 50 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Minor-grid source</Text>
        <Text fill="gray" font={{ size: 12 }}>
          grid.minor.ticks
        </Text>
      </Node>
      <Node
        id="minor-visible"
        position={[475, 20]}
        minimumSize={{ width: 154, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Minor-grid positions</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Filter overlaps
        </Text>
      </Node>
    </LogicFrame>

    <Draw way={['axis-source', 'axis-candidates']} arrow="->" />
    <Draw way={['axis-candidates', 'axis-visible']} arrow="->" />
    <Draw way={['axis-visible', 'grid-source']} arrow="->" />
    <Draw way={['grid-source', 'grid-visible']} arrow="->" />
    <Draw way={['minor-source', 'minor-visible']} arrow="->" />
    <Draw way={['grid-visible', 'minor-visible']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
