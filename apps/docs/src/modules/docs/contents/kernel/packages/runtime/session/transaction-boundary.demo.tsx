import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** publish 前失败回滚 candidate，publish 后失败只进入 diagnostics，dispose 走独立状态机 */
const Demo: FC = () => (
  <Layout width={500} height={480} style={{ maxWidth: '100%', height: 'auto' }}>
    <LogicFrame id="transaction">
      <LogicFrameTitle>Atomic transaction</LogicFrameTitle>
      <Node
        id="prepare"
        text={[
          { text: 'Prepare owners', font: { weight: 'bold' } },
          { text: 'candidate values', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -165]}
        minimumSize={{ width: 120, height: 46 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="run-programs"
        text={[
          { text: 'Run programs', font: { weight: 'bold' } },
          { text: 'topological order', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -100]}
        minimumSize={{ width: 124, height: 46 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="publish"
        text={[
          { text: 'Publish pointer', font: { weight: 'bold' } },
          { text: 'advance revision', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, -35]}
        minimumSize={{ width: 120, height: 46 }}
        stroke="green"
        fill="green"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="observe"
        text={[
          { text: 'Observe', font: { weight: 'bold' } },
          { text: 'published event', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 30]}
        minimumSize={{ width: 112, height: 46 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
      <Node
        id="retire"
        text={[
          { text: 'Retire previous', font: { weight: 'bold' } },
          { text: 'reverse order', fill: 'gray', font: { size: 11 } },
        ]}
        position={[0, 95]}
        minimumSize={{ width: 124, height: 46 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13 }}
        lineHeight={15}
      />
    </LogicFrame>

    <Node
      id="rollback"
      text={[
        { text: 'Rollback candidates', font: { weight: 'bold' } },
        { text: 'reverse retire', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-155, -35]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="unchanged"
      text={[
        { text: 'Current unchanged', font: { weight: 'bold' } },
        { text: 'same revision', fill: 'gray', font: { size: 11 } },
      ]}
      position={[-155, 35]}
      minimumSize={{ width: 130, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />
    <Node
      id="diagnostic-queue"
      text={[
        { text: 'Diagnostic queue', font: { weight: 'bold' } },
        { text: 'no rollback', fill: 'gray', font: { size: 11 } },
      ]}
      position={[155, 65]}
      minimumSize={{ width: 134, height: 46 }}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 13 }}
      lineHeight={15}
    />

    <LogicFrame id="disposal">
      <LogicFrameTitle>Session disposal</LogicFrameTitle>
      <Node
        id="idle"
        position={[-120, 205]}
        minimumSize={{ width: 96, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        idle
      </Node>
      <Node
        id="disposing"
        position={[0, 205]}
        minimumSize={{ width: 106, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        disposing
      </Node>
      <Node
        id="disposed"
        position={[120, 205]}
        minimumSize={{ width: 106, height: 38 }}
        stroke="dodgerblue"
        fill="dodgerblue"
        fillOpacity={0.08}
        cornerRadius={4}
        font={{ size: 13, weight: 'bold' }}
      >
        disposed
      </Node>
    </LogicFrame>

    <Draw way={['prepare', 'run-programs']} arrow="->" stroke="gray" />
    <Draw way={['run-programs', 'publish']} arrow="->" stroke="green" />
    <Draw way={['publish', 'observe']} arrow="->" stroke="gray" />
    <Draw way={['observe', 'retire']} arrow="->" stroke="gray" />
    <Draw way={['run-programs', 'rollback']} arrow="->" stroke="red" dashPattern={[4, 3]} />
    <Draw way={['rollback', 'unchanged']} arrow="->" stroke="red" />
    <Draw way={['observe', 'diagnostic-queue']} arrow="->" stroke="red" dashPattern={[4, 3]} />
    <Draw way={['retire', 'diagnostic-queue']} arrow="->" stroke="red" dashPattern={[4, 3]} />
    <Draw way={['idle', 'disposing']} arrow="->" stroke="gray" />
    <Draw way={['disposing', 'disposed']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
