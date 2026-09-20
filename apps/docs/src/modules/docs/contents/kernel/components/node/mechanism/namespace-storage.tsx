import { Draw, Layout, Node, Scope } from '@retikz/react';
import { List, Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceStorageI18n } from './namespace-storage.i18n';

/** 命名表结构图的语言 */
export type NamespaceStorageProps = { lang?: Lang };

/** 展开栈数组、当前 Map 及单个条目中的几何记录 */
const NamespaceStorage: FC<NamespaceStorageProps> = props => {
  const { lang = 'zh' } = props;
  const t = namespaceStorageI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node
        position={[320, 0]}
        text={t.frames}
        style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
      />
      <List
        transforms={[{ kind: 'translate', x: 11, y: 27 }]}
        layout={{ width: 158, height: 34, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[
          {
            content: t.root,
          },
          {
            id: 'top',
            content: t.current,
          },
        ]}
      />
      <Scope transforms={[{ kind: 'translate', x: 20, y: 158 }]}>
        <Node
          position={[108, -30]}
          text={t.map}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 60 }, value: { width: 152 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'a-entry-key', content: 'a', style: { fill: 'dodgerblue' } },
              value: { id: 'a-entry', content: '{ layout, state }', style: { fill: 'dodgerblue' } },
            },
            {
              key: { id: 'b-entry-key', content: 'b' },
              value: { id: 'b-entry', content: '{ layout, state }' },
            },
          ]}
        />
      </Scope>
      <Scope transforms={[{ kind: 'translate', x: 342, y: 132 }]}>
        <Node
          position={[156, -30]}
          text={t.record}
          style={{ fill: 'none', stroke: 'none', textColor: 'currentColor', font: { size: 14 } }}
        />
        <Map
          transforms={[{ kind: 'translate', x: 0, y: -16 }]}
          layout={{ height: 32, gap: 2, padding: 0, key: { width: 134 }, value: { width: 174 } }}
          style={{ fill: 'gray', font: { size: 13 }, textColor: 'currentColor' }}
          entries={[
            {
              key: { id: 'a-state-key', content: 'state' },
              value: { id: 'a-state', content: "'resolved'" },
            },
            {
              key: { id: 'a-layout-key', content: 'layout.rect' },
              value: { id: 'a-layout', content: 'x: 40, y: 0' },
            },
            {
              key: { id: 'a-size-key', content: '↳ width / height' },
              value: { id: 'a-size', content: '60 / 32' },
            },
            {
              key: { id: 'a-shape-key', content: 'layout.shapeDef' },
              value: { id: 'a-shape', content: 'rectangle' },
            },
            {
              key: { id: 'a-margin-key', content: 'layout.margin' },
              value: { id: 'a-margin', content: '0' },
            },
            {
              key: { id: 'a-boundary-key', content: '…' },
              value: { id: 'a-boundary', content: '…' },
            },
          ]}
        />
      </Scope>
      <Draw way={['top.bottom', [250, 92], [125, 92], [125, 113]]} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['a-entry.right', [330, 158]]} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[284, 140]}
        text={t.reference}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        id="measured-a"
        position={[128, 280]}
        text={['a: rect(40, 0, 60, 32)', t.source]}
        style={{ fill: 'none', stroke: 'none', font: { size: 13 } }}
      />
      <Draw way={['measured-a.left', [-8, 280], [-8, 158], 'a-entry-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <Node
        position={[120, 228]}
        text={t.write}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node
        position={[325, 365]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default NamespaceStorage;
