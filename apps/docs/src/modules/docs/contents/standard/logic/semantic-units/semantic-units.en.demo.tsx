import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { Decision, Junction, Stage, Terminal } from '@retikz/standard-react';

/** Demonstrates the four neutral semantic logic units */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 72 }]}>
      <Terminal id="unit-start" role="start">
        <Node position={[0, 0]} text="Start" />
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 145, y: 72 }]}>
      <Stage id="unit-stage" category="process">
        <Node position={[0, 0]} text="Stage" />
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 72 }]}>
      <Decision id="unit-decision">
        <Node position={[0, 0]} text="Ready?" />
      </Decision>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 82 }]}>
      <Junction id="unit-junction">
        <Node position={[0, 0]} text="+" />
      </Junction>
    </Scope>
  </Layout>
);

export default Demo;
