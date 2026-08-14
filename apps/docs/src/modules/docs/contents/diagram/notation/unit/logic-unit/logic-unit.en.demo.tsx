import type { FC } from 'react';

import { Decision, Junction, Stage, Terminal } from '@retikz/notation-react';
import { Layout, Scope } from '@retikz/react';

/** Demonstrates four logic units with LogicUnitVariant */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 72 }]}>
      <Terminal id="unit-start" position={[0, 0]} color="#2563eb" variant="default">
        Start
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 145, y: 72 }]}>
      <Stage id="unit-stage" position={[0, 0]} color="#16a34a" variant="primary">
        Stage
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 72 }]}>
      <Decision id="unit-decision" position={[0, 0]} color="#d97706" variant="secondary">
        Ready?
      </Decision>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 82 }]}>
      <Junction id="unit-junction" position={[0, 0]} color="#9333ea" variant="vibrant">
        +
      </Junction>
    </Scope>
  </Layout>
);

export default Demo;
