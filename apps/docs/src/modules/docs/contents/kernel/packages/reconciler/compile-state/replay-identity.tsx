import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 用同一个 token 串起布局结果与待提交的事务 */
const ReplayIdentity: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Map
      position={[0, 0]}
      label={{ text: 'layoutResults · WeakMap' }}
      defaultCell={{
        layout: { height: 36 },
        style: { font: { size: 13 } },
        key: { layout: { width: 90 } },
        value: { layout: { width: 155 } },
      }}
      entries={[{ key: { content: 'result A' }, value: { content: 'replay: token A', id: 'source-token' } }]}
    />
    <Map
      position={[306, 0]}
      label={{ text: 'replayTransactions · WeakMap' }}
      defaultCell={{
        layout: { height: 36 },
        style: { font: { size: 13 } },
        key: { layout: { width: 90 } },
        value: { layout: { width: 185 } },
      }}
      entries={[{ key: { content: 'token A', id: 'target-token' }, value: { content: 'transaction A · used: false' } }]}
    />
    <Draw way={['source-token.right', 'target-token.left']} arrow="->" />
  </Layout>
);
export default ReplayIdentity;
