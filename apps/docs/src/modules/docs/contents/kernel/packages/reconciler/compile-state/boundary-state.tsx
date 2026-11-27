import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 展示形状绑定的边界状态与最终几何的锚点表 */
const BoundaryState: FC = () => {
  const cell = { layout: { height: 30 }, style: { font: { size: 13 } } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        position={[0, 0]}
        label={{ text: 'stateMap · WeakMap' }}
        defaultCell={{ ...cell, key: { layout: { width: 116 } }, value: { layout: { width: 124 } } }}
        entries={[{ key: { content: 'A.shape' }, value: { content: 'state', id: 'state' } }]}
      />
      <Map
        position={[286, 0]}
        label={{ text: 'BoundaryState' }}
        defaultCell={{ ...cell, key: { layout: { width: 186 } }, value: { layout: { width: 155 } } }}
        entries={[
          { key: { content: 'connectionEnvelopeCache', id: 'envelopes' }, value: { content: 'Map → CenteredBox' } },
          { key: { content: 'connectionEnvelopeWarnings' }, value: { content: 'Set of envelope kinds' } },
        ]}
      />
      <Map
        position={[0, 118]}
        label={{ text: 'anchorCache · WeakMap' }}
        defaultCell={{ ...cell, key: { layout: { width: 116 } }, value: { layout: { width: 124 } } }}
        entries={[{ key: { content: 'geometry(A)' }, value: { content: 'anchors', id: 'anchors' } }]}
      />
      <Map
        position={[286, 118]}
        label={{ text: 'Map<string, Position>' }}
        defaultCell={{ ...cell, key: { layout: { width: 186 } }, value: { layout: { width: 155 } } }}
        entries={[
          { key: { content: 'A.right', id: 'right' }, value: { content: '[120, 50]' } },
          { key: { content: 'A.left' }, value: { content: '[80, 50]' } },
        ]}
      />
      <Draw way={['state.right', 'envelopes.left']} arrow="->" />
      <Draw way={['anchors.right', 'right.left']} arrow="->" />
    </Layout>
  );
};
export default BoundaryState;
