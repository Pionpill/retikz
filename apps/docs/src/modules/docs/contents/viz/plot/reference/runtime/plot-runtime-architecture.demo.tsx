import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** React 与 Vanilla 宿主共享 Plot lowering 和 Core 编译能力的架构图 */
const Demo: FC = () => (
  <Layout width={520} height={400} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="react-adapter">
      <LogicFrameTitle>@retikz/plot-react</LogicFrameTitle>
      <Node
        id="react-standalone"
        position={[-145, -125]}
        minimumSize={{ width: 126, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Plot</Text>
        <Text fill="gray" font={{ size: 12 }}>
          standalone
        </Text>
      </Node>
      <Node
        id="react-embedded"
        position={[-5, -125]}
        minimumSize={{ width: 126, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Plot</Text>
        <Text fill="gray" font={{ size: 12 }}>
          embedded Layout
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="vanilla-adapter">
      <LogicFrameTitle>@retikz/plot-vanilla</LogicFrameTitle>
      <Node
        id="vanilla"
        position={[155, -125]}
        minimumSize={{ width: 126, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>renderPlot</Text>
        <Text fill="gray" font={{ size: 12 }}>
          Vanilla · SSR
        </Text>
      </Node>
    </LogicFrame>

    <LogicFrame id="plot-runtime">
      <LogicFrameTitle>@retikz/plot</LogicFrameTitle>
      <Node
        id="lower"
        position={[0, -20]}
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
        position={[0, 70]}
        minimumSize={{ width: 132, height: 58 }}
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
      position={[0, 160]}
      minimumSize={{ width: 132, height: 58 }}
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

    <Draw
      way={[
        { id: 'react-standalone', anchor: 'bottom' },
        { id: 'lower', anchor: 'left' },
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        { id: 'react-embedded', anchor: 'bottom' },
        { id: 'lower', anchor: 'top', offset: [55, 0] },
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        { id: 'vanilla', anchor: 'bottom' },
        { id: 'lower', anchor: 'right' },
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        { id: 'lower', anchor: 'bottom', offset: [35, 0] },
        { id: 'compile', anchor: 'top', offset: [35, 0] },
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['compile', 'outputs']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
