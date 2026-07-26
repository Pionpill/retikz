import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** A layout-aware composite measures, solves, and commits one selected replay inside one Core compile */
const Demo: FC = () => (
  <Layout width={520} height={420} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="compile-boundary">
      <LogicFrameTitle>One Core compile</LogicFrameTitle>
      <Node
        id="compile"
        position={[0, -145]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Tier 2 compile</Text>
        <Text fill="gray" font={{ size: 12 }}>
          node + context
        </Text>
      </Node>
      <Node
        id="intrinsic"
        position={[0, -70]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Intrinsic probe</Text>
        <Text fill="gray" font={{ size: 12 }}>
          allocation · visual · replay A
        </Text>
      </Node>
      <Node
        id="solve"
        position={[0, 5]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Parent layout</Text>
        <Text fill="gray" font={{ size: 12 }}>
          columns · rows · constraints
        </Text>
      </Node>
      <Node
        id="constrained"
        position={[0, 80]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Constrained probe</Text>
        <Text fill="gray" font={{ size: 12 }}>
          allocation · visual · replay B
        </Text>
      </Node>
      <Node
        id="commit"
        position={[0, 155]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Commit replay once</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Scene · artifacts
        </Text>
      </Node>
    </LogicFrame>

    <Draw way={['compile', 'intrinsic']} arrow="->" />
    <Draw
      way={[
        'intrinsic',
        {
          label: {
            text: 'allocation',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'solve',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'solve',
        {
          label: {
            text: 'maxWidth',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'constrained',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'constrained',
        {
          label: {
            text: 'selected replay',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'commit',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
