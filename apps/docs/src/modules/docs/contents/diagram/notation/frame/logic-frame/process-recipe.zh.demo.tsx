import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import {
  Connector,
  Decision,
  LogicFrame,
  LogicFrameHeader,
  LogicFrameSection,
  Stage,
  Terminal,
} from '@retikz/notation-react';
import { Layout, Node, Scope, Step } from '@retikz/react';

/** 只存在于文档的 Process recipe，由公开 Notation 词汇组合而成 */
const Demo: FC = () => (
  <Layout width={640} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 18 }]}>
      <LogicFrame id="process-block" padding={12} rowGap={4}>
        <LogicFrameHeader>
          <Node position={[0, 0]} text="Process" />
        </LogicFrameHeader>
        <LogicFrameSection sectionKey="body">
          <Node position={[0, 0]} text="Input → transform → result" />
        </LogicFrameSection>
      </LogicFrame>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 72, y: 164 }]}>
      <Terminal id="process-start" position={[0, 0]}>
        Start
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 164 }]}>
      <Stage id="process-step" position={[0, 0]}>
        Transform
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 490, y: 164 }]}>
      <Decision id="process-check" position={[0, 0]}>
        Valid?
      </Decision>
    </Scope>
    <Connector id="process-edge-1" way={['process-start', 'process-step']} />
    <Connector id="process-edge-2">
      <Step kind="move" to="process-step" />
      <Step kind="fold" via={FoldStepVia.HorizontalThenVertical} to="process-check" />
    </Connector>
  </Layout>
);

export default Demo;
