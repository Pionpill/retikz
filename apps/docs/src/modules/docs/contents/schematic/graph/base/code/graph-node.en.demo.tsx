import type { FC } from 'react';

import { GraphNode } from '@retikz/graph-react';
import { Layout, Scope } from '@retikz/react';

/** Shows the four GraphNode roles with different variants */
const Demo: FC = () => (
  <Layout width={520} height={180}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 72 }]}>
      <GraphNode id="unit-start" role="terminal" position={[0, 0]} color="#2563eb" variant="default">
        Start
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 145, y: 72 }]}>
      <GraphNode id="unit-stage" role="stage" position={[0, 0]} color="#16a34a" variant="primary">
        Stage
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 72 }]}>
      <GraphNode id="unit-decision" role="decision" position={[0, 0]} color="#d97706" variant="secondary">
        Ready?
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 82 }]}>
      <GraphNode id="unit-junction" role="junction" position={[0, 0]} color="#9333ea" variant="vibrant">
        +
      </GraphNode>
    </Scope>
  </Layout>
);

export default Demo;
