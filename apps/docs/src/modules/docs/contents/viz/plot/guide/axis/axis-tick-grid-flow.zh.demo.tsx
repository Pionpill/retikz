import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Axis tick 与主 / 次网格的位置来源和分流逻辑 */
const Demo: FC = () => (
  <Layout>
    <LogicFigureFrame id="axis-tick-group">
      <LogicFigureFrameTitle>Axis tick</LogicFigureFrameTitle>
      <Node
        id="axis-source"
        position={[-280, -55]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 176, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>Axis tick 来源</Text>
        <Text fill="gray" font={{ size: 12 }}>
          values &gt; interval &gt; count
        </Text>
      </Node>
      <Node
        id="axis-candidates"
        position={[-75, -55]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 154, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>候选 tick</Text>
        <Text fill="gray" font={{ size: 12 }}>
          scale domain 内的位置
        </Text>
      </Node>
      <Node
        id="axis-visible"
        position={[110, -55]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 146, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>可见 tick</Text>
        <Text fill="gray" font={{ size: 12 }}>
          ticks.density 抽稀
        </Text>
      </Node>
    </LogicFigureFrame>

    <LogicFigureFrame id="grid-group">
      <LogicFigureFrameTitle>Grid</LogicFigureFrameTitle>
      <Node
        id="grid-source"
        position={[285, -55]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 154, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>主网格来源</Text>
        <Text fill="gray" font={{ size: 12 }}>
          复用或 grid.ticks
        </Text>
      </Node>
      <Node
        id="grid-visible"
        position={[475, -55]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 154, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>主网格位置</Text>
        <Text fill="gray" font={{ size: 12 }}>
          可选 grid.density
        </Text>
      </Node>
      <Node
        id="minor-source"
        position={[285, 20]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 154, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>次网格来源</Text>
        <Text fill="gray" font={{ size: 12 }}>
          grid.minor.ticks
        </Text>
      </Node>
      <Node
        id="minor-visible"
        position={[475, 20]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
        layout={{ minimumSize: { width: 154, height: 50 }, align: 'middle', lineHeight: 16 }}
      >
        <Text font={{ size: 14, weight: 'bold' }}>次网格位置</Text>
        <Text fill="gray" font={{ size: 12 }}>
          过滤重叠位置
        </Text>
      </Node>
    </LogicFigureFrame>

    <Draw way={['axis-source', 'axis-candidates']} arrow="->" />
    <Draw way={['axis-candidates', 'axis-visible']} arrow="->" />
    <Draw way={['axis-visible', 'grid-source']} arrow="->" />
    <Draw way={['grid-source', 'grid-visible']} arrow="->" />
    <Draw way={['minor-source', 'minor-visible']} arrow="->" />
    <Draw way={['grid-visible', 'minor-visible']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
  </Layout>
);

export default Demo;
