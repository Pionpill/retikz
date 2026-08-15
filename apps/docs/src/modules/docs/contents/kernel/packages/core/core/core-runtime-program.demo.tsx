import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Core 把完整 IR Snapshot 编译为由 Runtime 原子发布的 public artifact */
const Demo: FC = () => (
  <Layout width={860} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="ir-snapshot"
      text={[
        { text: 'IR Snapshot', font: { weight: 'bold' } },
        { text: 'complete document', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-350, 0]}
      minimumSize={{ width: 126, height: 48 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <LogicFigureFrame id="core-group">
      <LogicFigureFrameTitle>@retikz/core</LogicFigureFrameTitle>
      <Node
        id="core-owner"
        text={[
          { text: 'CoreOwnerDefinition', font: { weight: 'bold' } },
          { text: 'capture · equality', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-185, 0]}
        minimumSize={{ width: 154, height: 48 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="core-program"
        text={[
          { text: 'createCoreProgram', font: { weight: 'bold' } },
          { text: 'compile · diagnostics', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-8, 0]}
        minimumSize={{ width: 154, height: 48 }}
        stroke="darkorange"
        fill="darkorange"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
    </LogicFigureFrame>

    <Node
      id="runtime-session"
      text={[
        { text: 'Runtime Session', font: { weight: 'bold' } },
        { text: 'atomic publish', fill: 'gray', font: { size: 11 } },
      ]}
      position={[165, 0]}
      minimumSize={{ width: 136, height: 48 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Node
      id="public-read"
      text={[
        { text: 'Core public read', font: { weight: 'bold' } },
        { text: 'result · snapshot · patch', fill: 'gray', font: { size: 11 } },
      ]}
      position={[333, 0]}
      minimumSize={{ width: 160, height: 48 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <Draw way={['ir-snapshot', 'core-owner']} arrow="->" stroke="gray" />
    <Draw way={['core-owner', 'core-program']} arrow="->" stroke="gray" />
    <Draw way={['core-program', 'runtime-session']} arrow="->" stroke="gray" />
    <Draw way={['runtime-session', 'public-read']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
