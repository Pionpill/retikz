import { DrawWay } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
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
      <List
        transforms={[{ kind: 'translate', x: 20, y: 45 }]}
        label={{ text: t.frames, opacity: 0.8, font: { size: 12 } }}
        layout={{ width: 158, height: 34, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[{ content: t.root }, { id: 'top', content: t.current }]}
      />
      <Map
        transforms={[{ kind: 'translate', x: 65, y: 160 }]}
        label={{
          text: t.map,
          position: 'bottom',
          opacity: 0.8,
          font: { size: 12 },
        }}
        id="current-map"
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 152 } }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
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
      <Map
        transforms={[{ kind: 'translate', x: 430, y: 45 }]}
        label={{ text: t.record, opacity: 0.8, font: { size: 12 } }}
        id="record"
        layout={{ padding: 6 }}
        style={{ font: { size: 13 }, textColor: 'currentColor' }}
        data={{
          state: 'resolved',
          layout: { rect: { x: 40, y: 0, width: 60, height: 32 }, shapeName: 'rectangle' },
        }}
      />
      <Node
        position={[172, 115]}
        id="measured-a"
        cornerRadius={8}
        text={['a: rect(40, 0, 60, 32)', t.source]}
        style={{
          fill: 'dodgerblue',
          fillOpacity: 0.14,
          stroke: 'none',
          textColor: 'currentColor',
          font: { size: 13 },
        }}
      />
      <Node
        position={[380, 310]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Draw
        way={[
          'top.bottom',
          {
            label: {
              text: t.select,
              side: 'right',
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          { verticalTo: 'current-map.top' },
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'a-entry.right',
          {
            label: {
              text: t.reference,
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          { horizontalTo: 'record.left' },
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'measured-a.left',
          { position: [-72, 0], type: DrawWay.Relative },
          {
            label: {
              text: t.write,
              position: 0.25,
              side: 'left',
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          '|-',
          'a-entry-key.left',
        ]}
        arrow="->"
      />
    </Layout>
  );
};
export default NamespaceStorage;
