import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceScopeI18n } from './namespace-scope.i18n';
import { NamespaceCaption, NamespaceTable } from './NamespaceDiagramParts';

/** 局部命名空间图的语言 */
export type NamespaceScopeProps = { lang?: Lang };

/** 对照局部 frame 入栈期间和出栈后的可见条目 */
const NamespaceScope: FC<NamespaceScopeProps> = props => {
  const { lang = 'zh' } = props;
  const t = namespaceScopeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <NamespaceCaption position={[153, 0]} text={t.inside} />
      <NamespaceCaption position={[503, 0]} text={t.after} />
      <NamespaceTable
        position={[20, 72]}
        title={t.top}
        rows={[
          { id: 'inner-a', key: 'a', value: t.innerLayout, active: true },
          { id: 'inner-c', key: 'c', value: t.localLayout },
        ]}
      />
      <NamespaceCaption position={[143, 151]} text={t.hit} secondary />
      <NamespaceCaption position={[166, 179]} text={t.miss} secondary />
      <NamespaceTable
        position={[20, 253]}
        title={t.root}
        valueWidth={208}
        rows={[
          { id: 'outer-a', key: 'a', value: t.outerLayout },
          { id: 'outer-b', key: 'b', value: t.outerLayout },
          { id: 'outer-group', key: 'group', value: 'scope-placeholder' },
        ]}
      />
      <NamespaceTable
        position={[370, 253]}
        title={t.root}
        valueWidth={208}
        rows={[
          { id: 'after-a', key: 'a', value: t.outerLayout, active: true },
          { id: 'after-b', key: 'b', value: t.outerLayout },
          { id: 'after-group', key: 'group', value: 'resolved' },
        ]}
      />
      <Draw way={[[8, 72], [-5, 72], [-5, 287], 'outer-b-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        id="after-query"
        position={[505, 80]}
        text={t.result}
        style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}
      />
      <Draw way={['after-query.right', [665, 80], [665, 253], 'after-a.right']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[505, 178]} text={t.removed} secondary />
      <Draw way={['outer-group.right', 'after-group-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[325, 383]} text={t.note} secondary />
    </Layout>
  );
};
export default NamespaceScope;
