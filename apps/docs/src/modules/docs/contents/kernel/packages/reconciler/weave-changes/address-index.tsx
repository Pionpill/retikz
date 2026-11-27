import { Draw, Layout, Scope } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { addressIndexI18n } from './address-index.i18n';

/** 对照同一批插入前后的条目与声明地址；箭头表示两个索引的查询方向 */
const AddressIndex: FC<{ lang?: Lang }> = ({ lang = 'zh' }) => {
  const t = addressIndexI18n[lang];
  const cell = { layout: { width: 86, height: 30 }, style: { font: { size: 13 } } };
  const snapshots = [
    { id: 'before', x: 0, title: t.before, entries: ['A', 'B', 'Path A–B'] },
    { id: 'after', x: 286, title: t.after, entries: ['A', 'X', 'B', 'Path A–B'] },
  ];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {snapshots.map(({ id, x, title, entries }) => (
        <Scope key={id}>
          <Array
            position={[x, 0]}
            label={{ text: title }}
            defaultCell={cell}
            items={entries.map((name, i) => ({
              id: `${id}-entry-${i}`,
              content: name,
              ...(name === 'B' ? { style: { fill: 'dodgerblue', opacity: { fill: 0.18 } } } : {}),
            }))}
          />
          <Array
            position={[x, 78]}
            defaultCell={cell}
            items={entries.map((_, i) => ({ id: `${id}-address-${i}`, content: `children[${i}]` }))}
          />
          {entries.map((name, i) => (
            <Draw key={name} way={[`${id}-entry-${i}.bottom`, `${id}-address-${i}.top`]} arrow="<->" />
          ))}
        </Scope>
      ))}
    </Layout>
  );
};
export default AddressIndex;
