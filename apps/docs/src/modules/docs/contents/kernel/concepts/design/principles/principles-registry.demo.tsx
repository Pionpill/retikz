import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** 内置与自定义 Definition 共用协议、registry 与 compile consumer */
const Demo: FC = () => (
  <Layout width={760} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFigureFrame id="definition-contract">
      <LogicFigureFrameTitle>XxxDefinition contract</LogicFigureFrameTitle>
      <Node
        id="builtins"
        text="BUILTIN_*"
        position={[-250, -18]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 34 } }}
      />
      <Node
        id="custom"
        text="defineXxx(custom)"
        position={[-250, 28]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 150, height: 34 } }}
      />
    </LogicFigureFrame>
    <Node
      id="resolver"
      text="resolveXxxRegistry"
      position={[-45, 5]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="registry"
      text={[
        { text: 'effective registry', font: { size: 14, weight: 'bold' } },
        { text: 'ReadonlyMap', fill: 'gray', font: { size: 12 } },
      ]}
      position={[150, 5]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="consumer"
      text="compile consumer"
      position={[320, 5]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.08, font: { size: 13 } }}
    />

    <Draw way={['builtins', 'resolver']} arrow="->" />
    <Draw way={['custom', 'resolver']} arrow="->" />
    <Draw way={['resolver', 'registry']} arrow="->" />
    <Draw way={['registry', 'consumer']} arrow="->" />
  </Layout>
);

export default Demo;
