import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** 布局感知 composite 在同一次 Core compile 中测量、求解并提交选中 replay 的闭环 */
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
        <Text font={{ size: 14, weight: 'bold' }}>自然尺寸 probe</Text>
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
        <Text font={{ size: 14, weight: 'bold' }}>父布局求解</Text>
        <Text fill="gray" font={{ size: 12 }}>
          列 · 行 · 约束
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
        <Text font={{ size: 14, weight: 'bold' }}>约束后 probe</Text>
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
        <Text font={{ size: 14, weight: 'bold' }}>单次 replay 提交</Text>
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
