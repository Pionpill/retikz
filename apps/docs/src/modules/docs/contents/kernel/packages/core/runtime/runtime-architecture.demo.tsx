import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** Runtime 接收完整领域输入，在 registry 约束下发布 Snapshot 与 artifact */
const Demo: FC = () => (
  <Layout width={520} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="domain-inputs"
      text={[
        { text: 'Domain inputs', font: { weight: 'bold' } },
        { text: 'complete state', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, -145]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 126, height: 48 }, lineHeight: 15 }}
    />

    <LogicFigureFrame id="runtime-group">
      <LogicFigureFrameTitle>@retikz/runtime</LogicFigureFrameTitle>
      <Node
        id="owner-registry"
        text={[
          { text: 'Owner registry', font: { weight: 'bold' } },
          { text: 'ownership contract', fill: 'gray', font: { size: 11 } },
        ]}
        position={[-150, -55]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 138, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="program-registry"
        text={[
          { text: 'Program registry', font: { weight: 'bold' } },
          { text: 'dependency DAG', fill: 'gray', font: { size: 11 } },
        ]}
        position={[150, -55]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 138, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="session"
        text={[
          { text: 'Runtime Session', font: { weight: 'bold' } },
          { text: 'transaction · revision', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 20]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 146, height: 50 }, lineHeight: 15 }}
      />
      <Node
        id="observation"
        text={[
          { text: 'Trace · diagnostics', font: { weight: 'bold' } },
          { text: 'isolated observation', fill: 'gray', font: { size: 11 } },
        ]}
        position={[150, 65]}
        cornerRadius={4}
        style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.06, font: { size: 13 } }}
        layout={{ minimumSize: { width: 146, height: 44 }, lineHeight: 15 }}
      />
    </LogicFigureFrame>

    <Node
      id="published-output"
      text={[
        { text: 'Snapshots · artifacts', font: { weight: 'bold' } },
        { text: 'published revision', fill: 'gray', font: { size: 11 } },
      ]}
      position={[0, 145]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 154, height: 48 }, lineHeight: 15 }}
    />

    <Draw
      way={[
        'domain-inputs',
        {
          label: {
            text: 'commands',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'session',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw way={['owner-registry', 'session']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['program-registry', 'session']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw
      way={[
        'session',
        {
          label: {
            text: 'publish',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'published-output',
      ]}
      arrow="->"
      style={{ stroke: 'gray' }}
    />
    <Draw way={['session', 'observation']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
  </Layout>
);

export default Demo;
