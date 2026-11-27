import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 对照父子执行帧各自引用的继承数据，例中仅覆盖节点填充 */
const ScopeInheritance: FC = () => {
  const cell = { layout: { height: 30 }, style: { font: { size: 13 } } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {(['outer', 'inner'] as const).map((scope, i) => (
        <Map
          key={scope}
          position={[0, i * 120]}
          label={{ text: scope + ' · frame.context' }}
          defaultCell={{ ...cell, key: { layout: { width: 100 } }, value: { layout: { width: 54 } } }}
          entries={[
            { key: { content: 'inheritance' }, value: { content: scope === 'outer' ? 'I₁' : 'I₂', id: scope } },
          ]}
        />
      ))}
      {(['I₁', 'I₂'] as const).map((name, i) => (
        <Map
          key={name}
          position={[210, i * 120]}
          label={{ text: name + ' · CanonicalScopeInheritance' }}
          defaultCell={{ ...cell, key: { layout: { width: 172 } }, value: { layout: { width: 78 } } }}
          entries={[
            {
              key: { content: 'defaults.node.style.fill', id: 'fill' + i },
              value: { content: i === 0 ? 'blue' : 'red' },
            },
            { key: { content: 'theme' }, value: { content: 'T' } },
          ]}
        />
      ))}
      <Draw way={['outer.right', 'fill0.left']} arrow="->" />
      <Draw way={['inner.right', 'fill1.left']} arrow="->" />
    </Layout>
  );
};
export default ScopeInheritance;
