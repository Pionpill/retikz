import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Legend reuses channel descriptors, selects a form, and lowers into an independent scope */
const Demo: FC = () => (
  <Layout width={760} height={225} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="legend-guide"
      position={[-275, -50]}
      minimumSize={{ width: 170, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Legend guide</Text>
      <Text fill="gray" font={{ size: 12 }}>
        channel · scale? · ticks · layer?
      </Text>
    </Node>
    <Node
      id="descriptors"
      position={[-275, 50]}
      minimumSize={{ width: 170, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Channel descriptors</Text>
      <Text fill="gray" font={{ size: 12 }}>
        domain · range · evaluator
      </Text>
    </Node>

    <Node
      id="legend-resolver"
      position={[-80, 0]}
      minimumSize={{ width: 160, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Resolve legend</Text>
      <Text fill="gray" font={{ size: 12 }}>
        unique descriptor + form
      </Text>
    </Node>

    <Node
      id="theme-style"
      position={[-80, 95]}
      minimumSize={{ width: 180, height: 50 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Theme + style</Text>
      <Text fill="gray" font={{ size: 12 }}>
        defaults + local override
      </Text>
    </Node>

    <LogicFrame id="legend-forms">
      <LogicFrameTitle>Legend forms</LogicFrameTitle>
      <Node
        id="swatch-form"
        position={[120, -65]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Swatches</Text>
        <Text fill="gray" font={{ size: 12 }}>
          categorical · binned
        </Text>
      </Node>
      <Node
        id="ramp-form"
        position={[120, 0]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Ramp</Text>
        <Text fill="gray" font={{ size: 12 }}>
          continuous color + ticks
        </Text>
      </Node>
      <Node
        id="symbol-form"
        position={[120, 65]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Symbol entries</Text>
        <Text fill="gray" font={{ size: 12 }}>
          size · shape · opacity
        </Text>
      </Node>
    </LogicFrame>

    <Node
      id="legend-scope"
      position={[330, 0]}
      minimumSize={{ width: 180, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Legend scope</Text>
      <Text fill="gray" font={{ size: 12 }}>
        reserved band · zIndex 500 / layer
      </Text>
    </Node>

    <Draw way={['legend-guide', 'legend-resolver']} arrow="->" />
    <Draw way={['descriptors', 'legend-resolver']} arrow="->" />
    <Draw way={['theme-style', 'legend-resolver']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['legend-resolver', 'swatch-form']} arrow="->" />
    <Draw way={['legend-resolver', 'ramp-form']} arrow="->" />
    <Draw way={['legend-resolver', 'symbol-form']} arrow="->" />
    <Draw way={['swatch-form', 'legend-scope']} arrow="->" />
    <Draw way={['ramp-form', 'legend-scope']} arrow="->" />
    <Draw way={['symbol-form', 'legend-scope']} arrow="->" />
  </Layout>
);

export default Demo;
