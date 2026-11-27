import { Draw, Layout } from '@retikz/react';
import { Array, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { scopeStorageI18n } from './scope-storage.i18n';

/** 执行帧存储图的语言 */
export type ScopeStorageProps = { lang?: Lang };

/** 对照路径任务的引用、节点名称登记和原位回填前后的同一图元数组 */
const ScopeStorage: FC<ScopeStorageProps> = props => {
  const { lang = 'zh' } = props;
  const t = scopeStorageI18n[lang];
  const nodeItems = [{ content: 'Node A …' }, { content: 'Node B …' }];
  const cell = { layout: { width: 96, height: 32 }, style: { font: { size: 13 } } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        position={[0, 0]}
        label={{ text: 'Scope.children · ' + t.input }}
        defaultCell={cell}
        items={[{ content: 'Path(A → B)' }, ...nodeItems]}
      />
      <Map
        position={[0, 95]}
        label={{ text: '① queuePathChild · state.paths[0]' }}
        entries={[
          { key: { content: 'path' }, value: { content: 'Path(A → B)' } },
          { key: { content: 'placeholderSlot.primitives' }, value: { content: 'state.primitives' } },
          { key: { content: 'placeholderSlot.placeholder' }, value: { id: 'slot-ref', content: 'P' } },
        ]}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 170 } },
          value: { layout: { width: 108 } },
        }}
      />
      <Map
        position={[0, 250]}
        label={{ text: '② assembleNode · namespaceStack' }}
        entries={['A', 'B'].map(id => ({ key: { content: id }, value: { content: '{ geometry, irPath }' } }))}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 48 } },
          value: { layout: { width: 142 } },
        }}
      />
      <Array
        position={[360, 155]}
        label={{ text: 'state.primitives · ' + t.before }}
        defaultCell={cell}
        items={[{ id: 'placeholder', content: t.slot, style: { fill: 'dodgerblue' } }, ...nodeItems]}
      />
      <Array
        position={[360, 250]}
        label={{ text: '③ flushPendingPathEmissions · ' + t.after, position: 'bottom' }}
        defaultCell={cell}
        items={[{ id: 'result', content: 'Path(A → B)', style: { fill: 'dodgerblue' } }, ...nodeItems]}
      />
      <Draw way={['slot-ref.right', 'placeholder.left']} arrow="->" />
      <Draw
        way={['placeholder.bottom', { label: { text: t.replace, side: 'right', font: { size: 12 } } }, 'result.top']}
        arrow="->"
      />
    </Layout>
  );
};
export default ScopeStorage;
