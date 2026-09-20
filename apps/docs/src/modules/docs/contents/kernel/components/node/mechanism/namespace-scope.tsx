import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceScopeI18n } from './namespace-scope.i18n';

/** 局部命名空间图的语言 */
export type NamespaceScopeProps = { lang?: Lang };

/** 对照局部 frame 入栈期间和出栈后的可见条目 */
const NamespaceScope: FC<NamespaceScopeProps> = props => {
  const { lang = 'zh' } = props;
  const t = namespaceScopeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node
        position={[153, 0]}
        text={t.inside}
        style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
      />
      <Node
        position={[503, 0]}
        text={t.after}
        style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
      />
      <Scope transforms={[{ kind: 'translate', x: 20, y: 72 }]}>
        <Node
          position={[108, -30]}
          text={t.top}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 60 }, value: { width: 152 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'inner-a-key', content: 'a', style: { fill: 'dodgerblue' } },
              value: { id: 'inner-a', content: t.innerLayout, style: { fill: 'dodgerblue' } },
            },
            {
              key: { id: 'inner-c-key', content: 'c' },
              value: { id: 'inner-c', content: t.localLayout },
            },
          ]}
        />
      </Scope>
      <Node
        position={[143, 151]}
        text={t.hit}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[166, 179]}
        text={t.miss}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Scope transforms={[{ kind: 'translate', x: 20, y: 253 }]}>
        <Node
          position={[135, -30]}
          text={t.root}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 60 }, value: { width: 206 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'outer-a-key', content: 'a' },
              value: { id: 'outer-a', content: t.outerLayout },
            },
            {
              key: { id: 'outer-b-key', content: 'b' },
              value: { id: 'outer-b', content: t.outerLayout },
            },
            {
              key: { id: 'outer-group-key', content: 'group' },
              value: { id: 'outer-group', content: 'scope-placeholder' },
            },
          ]}
        />
      </Scope>
      <Scope transforms={[{ kind: 'translate', x: 370, y: 253 }]}>
        <Node
          position={[135, -30]}
          text={t.root}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 60 }, value: { width: 206 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'after-a-key', content: 'a', style: { fill: 'dodgerblue' } },
              value: { id: 'after-a', content: t.outerLayout, style: { fill: 'dodgerblue' } },
            },
            {
              key: { id: 'after-b-key', content: 'b' },
              value: { id: 'after-b', content: t.outerLayout },
            },
            {
              key: { id: 'after-group-key', content: 'group' },
              value: { id: 'after-group', content: 'resolved' },
            },
          ]}
        />
      </Scope>
      <Draw way={[[8, 72], [-5, 72], [-5, 287], 'outer-b-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        id="after-query"
        position={[505, 80]}
        text={t.result}
        style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}
      />
      <Draw way={['after-query.right', [665, 80], [665, 253], 'after-a.right']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[505, 178]}
        text={t.removed}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Draw way={['outer-group.right', 'after-group-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[325, 383]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default NamespaceScope;
