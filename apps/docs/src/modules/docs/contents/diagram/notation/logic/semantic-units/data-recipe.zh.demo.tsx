import type { FC } from 'react';

import { Connector, Decision, Stage, Terminal } from '@retikz/notation-react';
import { Layout, Scope } from '@retikz/react';

/** 只存在于文档的 Data recipe，使用中性单元与显式关系 */
const Demo: FC = () => (
  <Layout width={560} height={230}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 96 }]}>
      <Terminal id="data-source" position={[0, 0]}>
        Source
      </Terminal>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 205, y: 96 }]}>
      <Stage id="data-clean" position={[0, 0]}>
        Clean
      </Stage>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 380, y: 96 }]}>
      <Decision id="data-valid" position={[0, 0]}>
        Valid?
      </Decision>
    </Scope>
    <Connector id="data-edge-1" from={{ id: 'data-source' }} to={{ id: 'data-clean' }} />
    <Connector id="data-edge-2" from={{ id: 'data-clean' }} to={{ id: 'data-valid' }} label={{ text: 'validate' }} />
  </Layout>
);

export default Demo;
