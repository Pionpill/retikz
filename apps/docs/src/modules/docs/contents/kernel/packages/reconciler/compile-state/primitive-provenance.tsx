import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 对照图元身份记录和收尾时生成的最终路径 */
const PrimitiveProvenance: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Map
      position={[0, 0]}
      label={{ text: 'recordPrimitives · primitiveRecordMap' }}
      defaultCell={{
        layout: { height: 32 },
        style: { font: { size: 13 } },
        key: { layout: { width: 90 } },
        value: { layout: { width: 175 } },
      }}
      entries={[{ key: { content: 'p' }, value: { content: 'owner A · node:rect · 0', id: 'record' } }]}
    />
    <Map
      position={[330, 0]}
      label={{ text: 'capture · owner A / emissions[0]' }}
      defaultCell={{
        layout: { height: 32 },
        style: { font: { size: 13 } },
        key: { layout: { width: 115 } },
        value: { layout: { width: 145 } },
      }}
      entries={[
        { key: { content: 'role' }, value: { content: 'node:rect' } },
        { key: { content: 'ordinal' }, value: { content: '0' } },
        { key: { content: 'primitivePath' }, value: { content: '["primitives", 1]' } },
      ]}
    />
  </Layout>
);
export default PrimitiveProvenance;
