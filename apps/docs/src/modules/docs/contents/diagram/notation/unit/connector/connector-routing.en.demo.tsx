import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { Connector, Decision, Stage, Terminal } from '@retikz/notation-react';
import { Layout, Scope, Step } from '@retikz/react';

/** Demonstrates straight, orthogonal, polyline, and labelled Connector routes */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 52 }]}>
      <Terminal id="route-start" position={[0, 0]}>
        Start
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 230, y: 52 }]}>
      <Stage id="route-stage" position={[0, 0]}>
        Stage
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 52 }]}>
      <Decision id="route-check" position={[0, 0]}>
        Check
      </Decision>
    </Scope>
    <Connector id="route-straight">
      <Step kind="move" to="route-start" />
      <Step to="route-stage" label={{ text: 'Path steps' }} />
    </Connector>
    <Connector
      id="route-orthogonal"
      way={[
        'route-stage',
        { label: { text: 'Draw way', position: 'near-start', side: 'top', distance: 10 } },
        FoldStepVia.HorizontalThenVertical,
        'route-check',
      ]}
    />
    <Connector id="route-polyline">
      <Step kind="move" to="route-start" />
      <Step to={[60, 190]} />
      <Step to={[460, 190]} />
      <Step to="route-check" label={{ text: 'polyline' }} />
    </Connector>
  </Layout>
);

export default Demo;
