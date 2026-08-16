import type { FC } from 'react';

import { Relation, Entity } from '@retikz/graph-react';
import { Layout, Scope, Step } from '@retikz/react';

/** 只存在于文档的 Data recipe，使用统一 Entity 与显式关系 */
const Demo: FC = () => (
  <Layout width={560} height={230}>
    <Scope transforms={[{ kind: 'translate', x: 32, y: 96 }]}>
      <Entity id="data-source" role="terminal" position={[0, 0]}>
        Source
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 205, y: 96 }]}>
      <Entity id="data-clean" role="stage" position={[0, 0]}>
        Clean
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 380, y: 96 }]}>
      <Entity id="data-valid" role="decision" position={[0, 0]}>
        Valid?
      </Entity>
    </Scope>
    <Relation id="data-edge-1" role="flow" way={['data-source', 'data-clean']} />
    <Relation id="data-edge-2" role="branch">
      <Step kind="move" to="data-clean" />
      <Step to="data-valid" label={{ text: 'validate' }} />
    </Relation>
  </Layout>
);

export default Demo;
