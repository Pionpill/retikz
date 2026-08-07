import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';
import { Connector, Decision, Stage, Terminal } from '@retikz/standard-react';

/** 只存在于文档的 Data recipe，使用中性单元与显式关系 */
const Demo: FC = () => (
  <Layout width={560} height={230}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 96 }]}>
      <Terminal id="data-source" role="start">
        <Node position={[0, 0]} text="Source" />
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 205, y: 96 }]}>
      <Stage id="data-clean">
        <Node position={[0, 0]} text="Clean" />
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 380, y: 96 }]}>
      <Decision id="data-valid">
        <Node position={[0, 0]} text="Valid?" />
      </Decision>
    </Scope>
    <Connector id="data-edge-1" from={{ id: 'data-source' }} to={{ id: 'data-clean' }} />
    <Connector id="data-edge-2" from={{ id: 'data-clean' }} to={{ id: 'data-valid' }} label={{ text: 'validate' }} />
  </Layout>
);

export default Demo;
