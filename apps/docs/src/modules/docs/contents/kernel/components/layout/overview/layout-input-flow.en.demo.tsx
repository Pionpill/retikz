import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout ownership boundaries across React, Core, and the render host */
const Demo: FC = () => (
  <Layout width={640} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="react-adapter-group">
      <LogicFrameTitle>@retikz/react</LogicFrameTitle>
      <Node
        id="react-input"
        position={[-278, -15]}
        minimumSize={{ width: 112, height: 38 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 13 }}
      >
        JSX children / ir prop
      </Node>
      <Node
        id="layout"
        text={[
          { text: 'Layout', font: { weight: 'bold' } },
          { text: 'React adapter boundary', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-135, -15]}
        minimumSize={{ width: 118, height: 48 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="definitions"
        position={[-135, 42]}
        minimumSize={{ width: 132, height: 36 }}
        stroke="dimgray"
        fill="lightgray"
        fillOpacity={0.16}
        cornerRadius={4}
        font={{ size: 12 }}
      >
        definitions / options
      </Node>
    </LogicFrame>

    <Node
      id="core-compile"
      text={[
        { text: 'compileToScene', font: { weight: 'bold' } },
        { text: '@retikz/core · IR → Scene', fill: 'gray', font: { size: 11 } },
      ]}
      position={[35, -15]}
      minimumSize={{ width: 150, height: 48 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Node
      id="render-host"
      text={[
        { text: 'Render host', font: { weight: 'bold' } },
        { text: 'SVG / Canvas', fill: 'gray', font: { size: 11 } },
      ]}
      position={[225, -15]}
      minimumSize={{ width: 118, height: 48 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Draw way={['react-input', 'layout']} arrow="->" stroke="gray" />
    <Draw way={['definitions', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['layout', 'core-compile']} arrow="->" stroke="gray" />
    <Draw way={['core-compile', 'render-host']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
