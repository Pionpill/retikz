import { Layout, Node, Scope } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeLifecycleI18n } from './scope-lifecycle.i18n';

/** Scope 生命周期图的语言 */
export type ScopeLifecycleProps = { lang?: Lang };

/** 同一共享命名空间中，Scope 名称占位、子节点注册与包络完成的快照 */
const ScopeLifecycle: FC<ScopeLifecycleProps> = props => {
  const { lang = 'zh' } = props;
  const text = scopeLifecycleI18n[lang];
  return (
    <Layout
      style={{ maxWidth: '100%', height: 'auto' }}
      rootScope={{ defaults: { node: { style: { fill: 'none', stroke: 'none', font: { size: 14 } } } } }}
    >
      {text.stages.map((title, index) => (
        <Scope key={title} position={[index * 234, 0]}>
          <Node position={[103, -44]}>{title}</Node>
          <Map
            layout={{ height: 30, key: { width: 50 }, value: { width: 154 } }}
            label={{ text: text.map, position: 'top', font: { size: 12 }, textColor: 'gray' }}
            entries={[
              { key: 'S', value: index === 2 ? 'resolved' : 'scope-placeholder' },
              ...(index >= 1 ? [{ key: 'a', value: 'resolved' }] : []),
              ...(index === 2 ? [{ key: 'b', value: 'resolved' }] : []),
            ]}
          />
          {index === 0 ? (
            <Node position={[103, 154]} style={{ textColor: 'gray' }}>
              ?
            </Node>
          ) : (
            <Scope>
              {index === 2 && (
                <Node
                  position={[103, 154]}
                  layout={{ minimumSize: { width: 170, height: 56 } }}
                  shape="rectangle"
                  cornerRadius={4}
                  style={{ stroke: 'dodgerblue' }}
                />
              )}
              <Node position={[65, 154]} shape="circle" layout={{ minimumSize: 28 }} style={{ stroke: 'currentColor' }}>
                a
              </Node>
              {index === 2 && (
                <Node
                  position={[141, 154]}
                  shape="circle"
                  layout={{ minimumSize: 28 }}
                  style={{ stroke: 'currentColor' }}
                >
                  b
                </Node>
              )}
            </Scope>
          )}
          <Node position={[103, 205]} style={{ textColor: 'gray', font: { size: 12 } }}>
            {text.envelope[index]}
          </Node>
        </Scope>
      ))}
    </Layout>
  );
};

export default ScopeLifecycle;
