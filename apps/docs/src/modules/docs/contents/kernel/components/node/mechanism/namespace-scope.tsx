import { Draw, Layout, Node } from '@retikz/react';
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
      <Map
        id="local-frame"
        transforms={[{ kind: 'translate', x: 20, y: 56 }]}
        label={{ text: t.top, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 152 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Node
        position={[143, 151]}
        text={t.hit}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Map
        transforms={[{ kind: 'translate', x: 20, y: 237 }]}
        label={{ text: t.root, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 206 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Map
        transforms={[{ kind: 'translate', x: 370, y: 237 }]}
        label={{ text: t.root, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 206 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Draw
        way={[
          'local-frame.left',
          { horizontalTo: [-28, 0] },
          { label: { text: t.miss, side: 'right', textColor: 'gray', font: { size: 12 } } },
          { verticalTo: 'outer-b-key.left' },
          { horizontalTo: 'outer-b-key.left' },
        ]}
        arrow="->"
      />
      <Node
        id="after-query"
        cornerRadius={8}
        position={[505, 80]}
        text={t.result}
        style={{ fill: 'gray', fillOpacity: 0.14, stroke: 'none', font: { size: 13 } }}
      />
      <Draw way={['after-query.right', [665, 80], '|-', 'after-a.right']} arrow="->" />
      <Node
        position={[505, 178]}
        text={t.removed}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Draw way={['outer-group.right', { horizontalTo: 'after-group-key.left' }]} arrow="->" />
      <Node
        position={[325, 383]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default NamespaceScope;
