import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFigureFrame, LogicFigureFrameTitle } from '@/modules/docs/components/logic-figure';

/** publish 前失败回滚 candidate，publish 后失败只进入 diagnostics，dispose 走独立状态机 */
const Demo: FC = () => (
  <Layout>
    <LogicFigureFrame id="transaction">
      <LogicFigureFrameTitle>Atomic transaction</LogicFigureFrameTitle>
      <Node
        id="prepare"
        text={[
          { text: 'Prepare owners', font: { weight: 'bold' } },
          { text: 'candidate values', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -165]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 120, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="run-programs"
        text={[
          { text: 'Run programs', font: { weight: 'bold' } },
          { text: 'topological order', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -100]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 124, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="publish"
        text={[
          { text: 'Publish pointer', font: { weight: 'bold' } },
          { text: 'advance revision', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -35]}
        cornerRadius={4}
        style={{ stroke: 'green', fill: 'green', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 120, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="observe"
        text={[
          { text: 'Observe', font: { weight: 'bold' } },
          { text: 'published event', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 30]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 112, height: 46 }, lineHeight: 15 }}
      />
      <Node
        id="retire"
        text={[
          { text: 'Retire previous', font: { weight: 'bold' } },
          { text: 'reverse order', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 95]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
        layout={{ minimumSize: { width: 124, height: 46 }, lineHeight: 15 }}
      />
    </LogicFigureFrame>

    <Node
      id="rollback"
      text={[
        { text: 'Rollback candidates', font: { weight: 'bold' } },
        { text: 'reverse retire', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-155, -35]}
      cornerRadius={4}
      style={{ stroke: 'red', fill: 'red', fillOpacity: 0.06, font: { size: 13 } }}
      layout={{ minimumSize: { width: 140, height: 46 }, lineHeight: 15 }}
    />
    <Node
      id="unchanged"
      text={[
        { text: 'Current unchanged', font: { weight: 'bold' } },
        { text: 'same revision', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-155, 35]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
      layout={{ minimumSize: { width: 130, height: 46 }, lineHeight: 15 }}
    />
    <Node
      id="diagnostic-queue"
      text={[
        { text: 'Diagnostic queue', font: { weight: 'bold' } },
        { text: 'no rollback', fill: 'gray', font: { size: 11 } },
      ]}
      position={[155, 65]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.06, font: { size: 13 } }}
      layout={{ minimumSize: { width: 134, height: 46 }, lineHeight: 15 }}
    />

    <LogicFigureFrame id="disposal">
      <LogicFigureFrameTitle>Session disposal</LogicFigureFrameTitle>
      <Node
        id="idle"
        position={[-120, 205]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
        layout={{ minimumSize: { width: 96, height: 38 } }}
      >
        idle
      </Node>
      <Node
        id="disposing"
        position={[0, 205]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
        layout={{ minimumSize: { width: 106, height: 38 } }}
      >
        disposing
      </Node>
      <Node
        id="disposed"
        position={[120, 205]}
        cornerRadius={4}
        style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
        layout={{ minimumSize: { width: 106, height: 38 } }}
      >
        disposed
      </Node>
    </LogicFigureFrame>

    <Draw way={['prepare', 'run-programs']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['run-programs', 'publish']} arrow="->" style={{ stroke: 'green' }} />
    <Draw way={['publish', 'observe']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['observe', 'retire']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['run-programs', 'rollback']} arrow="->" style={{ stroke: 'red', dashPattern: [4, 3] }} />
    <Draw way={['rollback', 'unchanged']} arrow="->" style={{ stroke: 'red' }} />
    <Draw way={['observe', 'diagnostic-queue']} arrow="->" style={{ stroke: 'red', dashPattern: [4, 3] }} />
    <Draw way={['retire', 'diagnostic-queue']} arrow="->" style={{ stroke: 'red', dashPattern: [4, 3] }} />
    <Draw way={['idle', 'disposing']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['disposing', 'disposed']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
