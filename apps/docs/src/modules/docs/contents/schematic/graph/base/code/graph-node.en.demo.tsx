import type { FC } from 'react';

import { Entity } from '@retikz/graph-react';
import { Layout, Scope } from '@retikz/react';

/** Shows the four Entity roles with different variants */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 72 }]}>
      <Entity id="unit-start" role="terminal" position={[0, 0]} color="#2563eb" variant="default">
        Start
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 145, y: 72 }]}>
      <Entity id="unit-stage" role="stage" position={[0, 0]} color="#16a34a" variant="primary">
        Stage
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 72 }]}>
      <Entity id="unit-decision" role="decision" position={[0, 0]} color="#d97706" variant="secondary">
        Ready?
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 82 }]}>
      <Entity id="unit-junction" role="junction" position={[0, 0]} color="#9333ea" variant="vibrant">
        +
      </Entity>
    </Scope>
  </Layout>
);

export default Demo;
