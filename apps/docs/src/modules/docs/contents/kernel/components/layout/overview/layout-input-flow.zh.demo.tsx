import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Layout 在 React、Vanilla processing、Core 与渲染宿主之间的职责边界 */
const Demo: FC = () => (
  <Layout width={800} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="react-adapter-group">
      <LogicFigureFrameTitle>@retikz/react</LogicFigureFrameTitle>
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
          { text: 'Input 收集与结果宿主', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-135, -15]}
        minimumSize={{ width: 104, height: 48 }}
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
    </LogicFigureFrame>

    <Node
      id="vanilla-processing"
      text={[
        { text: 'Vanilla processing', font: { weight: 'bold' } },
        { text: 'Input → IR · Core Program', fill: 'gray', font: { size: 11 } },
      ]}
      position={[35, -15]}
      minimumSize={{ width: 150, height: 48 }}
      stroke="mediumseagreen"
      fill="mediumseagreen"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Node
      id="core-compile"
      text={[
        { text: 'compileToScene', font: { weight: 'bold' } },
        { text: '@retikz/core · IR → Scene', fill: 'gray', font: { size: 11 } },
      ]}
      position={[210, -15]}
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
        { text: '渲染宿主', font: { weight: 'bold' } },
        { text: 'SVG / Canvas', fill: 'gray', font: { size: 11 } },
      ]}
      position={[385, -15]}
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
    <Draw way={['layout', 'vanilla-processing']} arrow="->" stroke="gray" />
    <Draw way={['vanilla-processing', 'core-compile']} arrow="->" stroke="gray" />
    <Draw way={['core-compile', 'render-host']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
