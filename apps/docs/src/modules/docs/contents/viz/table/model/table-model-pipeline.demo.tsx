import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Table 类型共享的结构解析、呈现、布局与下沉管线 */
const Demo: FC = () => (
  <Layout>
    <LogicFigureFrame id="table-group">
      <LogicFigureFrameTitle>@retikz/table</LogicFigureFrameTitle>
      <Node
        id="spec"
        position={[-280, 0]}
        cornerRadius={4}
        style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      >
        IRTable
      </Node>
      <Node
        id="structure"
        position={[-175, 0]}
        cornerRadius={4}
        style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
      >
        Structure
      </Node>
      <Node
        id="semantic"
        position={[-55, 0]}
        cornerRadius={4}
        style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
      >
        Semantic model
      </Node>
      <Node
        id="presentation"
        position={[75, 0]}
        cornerRadius={4}
        style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
      >
        Presentation
      </Node>
      <Node
        id="layout"
        position={[180, 0]}
        cornerRadius={4}
        style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
      >
        Layout
      </Node>
    </LogicFigureFrame>
    <Node
      id="core"
      position={[305, -24]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
    >
      Scene
    </Node>
    <Node
      id="manifest"
      position={[305, 24]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
    >
      Manifest
    </Node>

    <Draw way={['spec', 'structure']} arrow="->" />
    <Draw way={['structure', 'semantic']} arrow="->" />
    <Draw way={['semantic', 'presentation']} arrow="->" />
    <Draw way={['presentation', 'layout']} arrow="->" />
    <Draw
      way={[
        'layout',
        {
          label: {
            text: 'compile',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'core',
      ]}
      arrow="->"
    />
    <Draw way={['layout', 'manifest']} arrow="->" />
  </Layout>
);

export default Demo;
