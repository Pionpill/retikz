import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** React 与 Vanilla 宿主共享 Plot lowering 和 Core 编译能力的架构图 */
const Demo: FC = () => (
  <Layout width={720} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="host-adapters-frame">
      <LogicFrameTitle>plot-react · plot-vanilla</LogicFrameTitle>
      <Node
        id="host-adapters"
        position={[-250, 10]}
        minimumSize={{ width: 174, height: 58 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Host adapters</Text>
        <Text fill="gray" font={{ size: 12 }}>
          standalone · embedded · SSR
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="plot-runtime">
      <LogicFrameTitle>@retikz/plot</LogicFrameTitle>
      <Node
        id="lower"
        position={[-60, 10]}
        minimumSize={{ width: 132, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>lowerPlots</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Plot semantics
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="core-runtime">
      <LogicFrameTitle>@retikz/core</LogicFrameTitle>
      <Node
        id="compile"
        position={[110, 10]}
        minimumSize={{ width: 144, height: 58 }}
        stroke="dimgray"
        fill="dimgray"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={17}
      >
        <Text font={{ size: 14, weight: 'bold' }}>compileToScene</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Core IR → Scene
        </Text>
      </Node>
    </LogicFrame>

    <Node
      id="outputs"
      position={[280, 10]}
      minimumSize={{ width: 146, height: 58 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={17}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Outputs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        SVG · Canvas · SVG string
      </Text>
    </Node>

    <Draw way={['host-adapters', 'lower']} arrow="->" stroke="gray" />
    <Draw way={['lower', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'outputs']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
