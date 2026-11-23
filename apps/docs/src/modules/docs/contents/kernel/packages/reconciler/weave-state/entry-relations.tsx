import { Draw, Layout } from '@retikz/react';
import { Array, Matrix } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entryRelationsI18n } from './entry-relations.i18n';

/** 条目关系图的显示语言 */
export type EntryRelationsProps = { lang?: Lang };

/** 展开一次边界读取的记录、正向依赖与反向消费者 */
const EntryRelations: FC<EntryRelationsProps> = props => {
  const { lang = 'zh' } = props;
  const t = entryRelationsI18n[lang];
  const cell = { layout: { width: 164, height: 32 }, style: { font: { size: 14 } } };
  const entry = { fill: 'dodgerblue', opacity: { fill: 0.16 } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Matrix
        defaultCell={cell}
        items={[
          [{ id: 'path', content: 'Path A–B', style: entry }],
          [{ id: 'dependencies', content: 'Path.dependencies' }],
          [{ id: 'reads', content: 'Path.referenceReads' }],
        ]}
      />
      <Matrix
        position={[228, 0]}
        defaultCell={cell}
        items={[[{ id: 'consumers', content: 'B.consumers' }], [{ id: 'node', content: 'Node B', style: entry }]]}
      />
      <Array position={[228, 68]} defaultCell={cell} items={[{ id: 'record', content: t.record }]} />
      <Draw way={['consumers.left', 'path.right']} arrow="->" />
      <Draw way={['dependencies.right', 'node.left']} arrow="->" />
      <Draw way={['reads.right', 'record.left']} arrow="->" />
    </Layout>
  );
};
export default EntryRelations;
