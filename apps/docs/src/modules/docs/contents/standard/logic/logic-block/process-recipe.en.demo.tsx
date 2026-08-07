import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import {
  Connector,
  Decision,
  LogicBlockBase,
  LogicBlockHeader,
  LogicBlockSection,
  Stage,
  Terminal,
} from '@retikz/standard-react';

/** Documentation-only Process recipe built from the public Logic vocabulary */
const Demo: FC = () => (
  <Layout width={640} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 18 }]}>
      <LogicBlockBase id="process-block" padding={12} rowGap={4}>
        <LogicBlockHeader>
          <Node position={[0, 0]} text="Process" />
        </LogicBlockHeader>
        <LogicBlockSection sectionKey="body">
          <Node position={[0, 0]} text="Input → transform → result" />
        </LogicBlockSection>
      </LogicBlockBase>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 72, y: 164 }]}>
      <Terminal id="process-start" role="start">
        <Node position={[0, 0]} text="Start" />
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 164 }]}>
      <Stage id="process-step">
        <Node position={[0, 0]} text="Transform" />
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 490, y: 164 }]}>
      <Decision id="process-check">
        <Node position={[0, 0]} text="Valid?" />
      </Decision>
    </Scope>
    <Connector id="process-edge-1" from={{ id: 'process-start' }} to={{ id: 'process-step' }} />
    <Connector
      id="process-edge-2"
      from={{ id: 'process-step' }}
      to={{ id: 'process-check' }}
      routing={{ kind: 'orthogonal', pattern: 'hv' }}
    />
  </Layout>
);

export default Demo;
