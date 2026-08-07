import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { Connector, Decision, Stage, Terminal } from '@retikz/standard-react';

/** 展示 straight、orthogonal、polyline 与带 label 的 Connector 路由 */
const Demo: FC = () => (
  <Layout width={560} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 52 }]}>
      <Terminal id="route-start" role="start">
        <Node position={[0, 0]} text="Start" />
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 230, y: 52 }]}>
      <Stage id="route-stage">
        <Node position={[0, 0]} text="Stage" />
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 430, y: 52 }]}>
      <Decision id="route-check">
        <Node position={[0, 0]} text="Check" />
      </Decision>
    </Scope>
    <Connector
      id="route-straight"
      from={{ id: 'route-start' }}
      to={{ id: 'route-stage' }}
      label={{ text: 'straight' }}
    />
    <Connector
      id="route-orthogonal"
      from={{ id: 'route-stage' }}
      to={{ id: 'route-check' }}
      routing={{ kind: 'orthogonal', pattern: 'hv' }}
      label={{ text: 'hv', position: 'near-start', side: 'top', distance: 10 }}
    />
    <Connector
      id="route-polyline"
      from={{ id: 'route-start' }}
      to={{ id: 'route-check' }}
      routing={{
        kind: 'polyline',
        points: [
          [60, 190],
          [460, 190],
        ],
      }}
      label={{ text: 'polyline' }}
    />
  </Layout>
);

export default Demo;
