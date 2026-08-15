import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { GraphConnector, GraphNode } from '@retikz/graph-react';
import { Layout, Scope, Step } from '@retikz/react';

/** Demonstrates straight, orthogonal, polyline, and labelled GraphConnector routes */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 52 }]}>
      <GraphNode id="route-start" role="terminal" position={[0, 0]}>
        Start
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 230, y: 52 }]}>
      <GraphNode id="route-stage" role="stage" position={[0, 0]}>
        Stage
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 52 }]}>
      <GraphNode id="route-check" role="decision" position={[0, 0]}>
        Check
      </GraphNode>
    </Scope>
    <GraphConnector id="route-straight" role="flow">
      <Step kind="move" to="route-start" />
      <Step to="route-stage" label={{ text: 'Path steps' }} />
    </GraphConnector>
    <GraphConnector
      id="route-orthogonal"
      role="branch"
      way={[
        'route-stage',
        { label: { text: 'Draw way', position: 'near-start', side: 'top', distance: 10 } },
        FoldStepVia.HorizontalThenVertical,
        'route-check',
      ]}
    />
    <GraphConnector id="route-polyline" role="flow">
      <Step kind="move" to="route-start" />
      <Step to={[60, 190]} />
      <Step to={[460, 190]} />
      <Step to="route-check" label={{ text: 'polyline' }} />
    </GraphConnector>
  </Layout>
);

export default Demo;
