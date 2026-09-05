import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout ownership boundaries across React, Vanilla processing, Core, and the render host */
const Demo: FC = () => (
  <Layout width={800} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="react-adapter-group">
      <LogicFigureFrameTitle>@retikz/react</LogicFigureFrameTitle>
      <Node
        id="react-input"
        position={[-278, -15]}
        cornerRadius={4}
        style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
        layout={{ minimumSize: { width: 112, height: 38 } }}
      >
        JSX children / ir prop
      </Node>
      <Node
        id="layout"
        text={[
          { text: 'Layout', font: { weight: 'bold' } },
          { text: 'Input collection and result host', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-135, -15]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 118, height: 48 }, lineHeight: 15 }}
      />
      <Node
        id="definitions"
        position={[-135, 42]}
        cornerRadius={4}
        style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 12 } }}
        layout={{ minimumSize: { width: 132, height: 36 } }}
      >
        definitions / options
      </Node>
    </LogicFigureFrame>

    <Node
      id="vanilla-processing"
      text={[
        { text: 'Vanilla processing', font: { weight: 'bold' } },
        { text: 'Input → IR · Core Program', fill: 'gray', font: { size: 11 } },
      ]}
      position={[35, -15]}
      cornerRadius={4}
      style={{ stroke: 'mediumseagreen', fill: 'mediumseagreen', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 150, height: 48 }, lineHeight: 15 }}
    />

    <Node
      id="core-compile"
      text={[
        { text: 'compileToScene', font: { weight: 'bold' } },
        { text: '@retikz/core · IR → Scene', fill: 'gray', font: { size: 11 } },
      ]}
      position={[210, -15]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 150, height: 48 }, lineHeight: 15 }}
    />

    <Node
      id="render-host"
      text={[
        { text: 'Render host', font: { weight: 'bold' } },
        { text: 'SVG / Canvas', fill: 'gray', font: { size: 11 } },
      ]}
      position={[385, -15]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 118, height: 48 }, lineHeight: 15 }}
    />

    <Draw way={['react-input', 'layout']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['definitions', 'layout']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['layout', 'vanilla-processing']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['vanilla-processing', 'core-compile']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['core-compile', 'render-host']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
