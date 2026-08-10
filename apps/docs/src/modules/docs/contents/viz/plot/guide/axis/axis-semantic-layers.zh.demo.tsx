import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Axis guide 下沉为独立 scope 后进入 Plot 语义层级的关系 */
const Demo: FC = () => (
  <Layout width={760} height={225} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="axis-guide"
      position={[-290, 20]}
      minimumSize={{ width: 158, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Axis guide</Text>
      <Text fill="gray" font={{ size: 12 }}>
        line · ticks · labels · grid
      </Text>
    </Node>

    <LogicFigureFrame id="lowered-scopes">
      <LogicFigureFrameTitle>Lowered scopes</LogicFigureFrameTitle>
      <Node
        id="axis-scope"
        position={[-80, -20]}
        minimumSize={{ width: 166, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>axis scope</Text>
        <Text fill="gray" font={{ size: 12 }}>
          zIndex = 200 或 layer.zIndex
        </Text>
      </Node>
      <Node
        id="grid-scope"
        position={[-80, 60]}
        minimumSize={{ width: 166, height: 50 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>grid scope</Text>
        <Text fill="gray" font={{ size: 12 }}>
          zIndex = -300
        </Text>
      </Node>
    </LogicFigureFrame>

    <Node
      id="layer-override"
      position={[-80, -120]}
      minimumSize={{ width: 166, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>layer.zIndex</Text>
      <Text fill="gray" font={{ size: 12 }}>
        只覆盖 axis scope
      </Text>
    </Node>

    <LogicFigureFrame id="semantic-stack">
      <LogicFigureFrameTitle>Plot semantic layers</LogicFigureFrameTitle>
      <Node
        id="legend-layer"
        position={[270, -66]}
        minimumSize={{ width: 164, height: 30 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={15}
      >
        <Text font={{ size: 13, weight: 'bold' }}>legend · zIndex 500</Text>
      </Node>
      <Node
        id="axis-layer"
        position={[270, -22]}
        minimumSize={{ width: 164, height: 30 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={15}
      >
        <Text font={{ size: 13, weight: 'bold' }}>axis · zIndex 200</Text>
      </Node>
      <Node
        id="mark-layer"
        position={[270, 22]}
        minimumSize={{ width: 164, height: 30 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={15}
      >
        <Text font={{ size: 13, weight: 'bold' }}>mark · zIndex 0</Text>
      </Node>
      <Node
        id="grid-layer"
        position={[270, 66]}
        minimumSize={{ width: 164, height: 30 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={15}
      >
        <Text font={{ size: 13, weight: 'bold' }}>grid · zIndex -300</Text>
      </Node>
    </LogicFigureFrame>

    <Draw way={['axis-guide', 'axis-scope']} arrow="->" />
    <Draw way={['axis-guide', 'grid-scope']} arrow="->" />
    <Draw way={['layer-override', 'axis-scope']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'axis-scope',
        {
          label: {
            text: 'layer',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'axis-layer',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'grid-scope',
        {
          label: {
            text: 'layer',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'grid-layer',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
