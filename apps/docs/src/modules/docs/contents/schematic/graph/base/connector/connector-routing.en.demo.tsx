import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { Relation, Entity } from '@retikz/graph-react';
import { Layout, Scope, Step } from '@retikz/react';

/** Demonstrates straight, orthogonal, polyline, and labelled Relation routes */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 52 }]}>
      <Entity id="route-start" role="terminal" position={[0, 0]}>
        Start
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 230, y: 52 }]}>
      <Entity id="route-stage" role="stage" position={[0, 0]}>
        Stage
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 52 }]}>
      <Entity id="route-check" role="decision" position={[0, 0]}>
        Check
      </Entity>
    </Scope>
    <Relation id="route-straight" role="flow">
      <Step kind="move" to="route-start" />
      <Step to="route-stage" label={{ text: 'Path steps' }} />
    </Relation>
    <Relation
      id="route-orthogonal"
      role="branch"
      way={[
        'route-stage',
        { label: { text: 'Draw way', position: 'near-start', side: 'top', distance: 10 } },
        FoldStepVia.HorizontalThenVertical,
        'route-check',
      ]}
    />
    <Relation id="route-polyline" role="flow">
      <Step kind="move" to="route-start" />
      <Step to={[60, 190]} />
      <Step to={[460, 190]} />
      <Step to="route-check" label={{ text: 'polyline' }} />
    </Relation>
  </Layout>
);

export default Demo;
