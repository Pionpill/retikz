import { Draw, Layout } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 对照嵌套 Scope 的变换链及各自缓存的合成结果 */
const TransformCache: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Array
      position={[0, 0]}
      label={{ text: 'Scope₁ · chain₁' }}
      defaultCell={{ layout: { width: 120, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'translate(100, 0)', id: 'outer-translate' }]}
    />
    <Array
      position={[0, 94]}
      label={{ text: 'Scope₁ › Scope₂ · chain₂' }}
      defaultCell={{ layout: { width: 120, height: 32 }, style: { font: { size: 13 } } }}
      items={[{ content: 'translate(100, 0)' }, { content: 'rotate(90°)', id: 'inner-rotate' }]}
    />
    <Map
      position={[298, 0]}
      label={{ text: 'transformCache → ComposedScopeTransform' }}
      defaultCell={{
        layout: { height: 32 },
        style: { font: { size: 13 } },
        key: { layout: { width: 78 } },
        value: { layout: { width: 203 } },
      }}
      entries={[
        { key: { content: 'chain₁', id: 'outer-key' }, value: { content: 'forward: T' } },
        { key: { content: 'chain₂', id: 'inner-key' }, value: { content: 'forward: T × R' } },
      ]}
    />
    <Draw way={['outer-translate.right', 'outer-key.left']} arrow="->" />
    <Draw way={['inner-rotate.right', 'inner-key.left']} arrow="->" />
  </Layout>
);
export default TransformCache;
