import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** 双轴 proposal 在同一次 Core compile 中求值、选择并提交的闭环 */
const Demo: FC = () => (
  <Layout width={520} height={420} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="compile-boundary">
      <LogicFrameTitle>同一次 Core compile</LogicFrameTitle>
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
        id="contribution"
        position={[0, -70]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>minimum / natural probe</Text>
        <Text fill="gray" font={{ size: 12 }}>
          resolved · failed
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
        <Text font={{ size: 14, weight: 'bold' }}>父 solver 求解</Text>
        <Text fill="gray" font={{ size: 12 }}>
          slot · alignment · overflow
        </Text>
      </Node>
      <Node
        id="allocation"
        position={[0, 80]}
        minimumSize={{ width: 260, height: 54 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>range / exact probe</Text>
        <Text fill="gray" font={{ size: 12 }}>
          slot · allocation · visual · guides
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
        <Text font={{ size: 14, weight: 'bold' }}>选择 replay 或 raise</Text>
        <Text fill="gray" font={{ size: 12 }}>
          one-use · atomic
        </Text>
      </Node>
    </LogicFrame>

    <Draw
      way={[
        'compile',
        {
          label: {
            text: 'context.proposal',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'contribution',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'contribution',
        {
          label: {
            text: 'resolved result',
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
            text: 'next proposal',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'allocation',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'allocation',
        {
          label: {
            text: 'replay / raise',
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
