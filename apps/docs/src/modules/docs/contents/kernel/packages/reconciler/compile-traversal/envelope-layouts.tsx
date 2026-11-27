import { Draw, Layout } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 对照匿名与具名 Scope 向父帧追加的布局几何 */
const EnvelopeLayouts: FC = () => {
  const cell = { layout: { width: 100, height: 32 }, style: { font: { size: 13 } } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        position={[0, 0]}
        label={{ text: 'state.geometries' }}
        defaultCell={cell}
        items={[
          { content: 'A', id: 'child-a' },
          { content: 'B', id: 'child-b' },
        ]}
      />
      <Map
        position={[282, 0]}
        label={{ text: 'compiled.layout.overall' }}
        defaultCell={{
          layout: { height: 32 },
          style: cell.style,
          key: { layout: { width: 100 } },
          value: { layout: { width: 112 } },
        }}
        entries={[
          { key: { content: 'geometry' }, value: { content: 'E(A, B)', id: 'envelope' } },
          { key: { content: 'transforms' }, value: { content: 'T' } },
        ]}
      />
      <Array
        position={[0, 120]}
        label={{ text: 'id: undefined', position: 'bottom' }}
        defaultCell={cell}
        items={[
          { content: 'T(A)', id: 'parent-a' },
          { content: 'T(B)', id: 'parent-b' },
        ]}
      />
      <Array
        position={[364, 120]}
        label={{ text: 'id: "group"', position: 'bottom' }}
        defaultCell={cell}
        items={[{ content: 'T(E)', id: 'parent-envelope' }]}
      />
      <Draw way={['child-a.bottom', 'parent-a.top']} arrow="->" />
      <Draw way={['child-b.bottom', 'parent-b.top']} arrow="->" />
      <Draw way={['envelope.right', [526, 16], [526, 136], 'parent-envelope.right']} arrow="->" />
    </Layout>
  );
};
export default EnvelopeLayouts;
