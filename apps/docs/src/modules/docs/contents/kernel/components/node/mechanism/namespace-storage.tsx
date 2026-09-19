import { Draw, Layout, Node } from '@retikz/react';
import { List } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceStorageI18n } from './namespace-storage.i18n';
import { NamespaceCaption, NamespaceTable } from './NamespaceDiagramParts';

/** 命名表结构图的语言 */
export type NamespaceStorageProps = { lang?: Lang };

/** 展开栈数组、当前 Map 及单个条目中的几何记录 */
const NamespaceStorage: FC<NamespaceStorageProps> = props => {
  const { lang = 'zh' } = props;
  const t = namespaceStorageI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <NamespaceCaption position={[320, 0]} text={t.frames} />
      <List
        transforms={[{ kind: 'translate', x: 11, y: 27 }]}
        layout={{ cellSize: { width: 158, height: 34 }, padding: 0 }}
        style={{ font: { size: 14 } }}
        items={[
          { content: <Node position={[0, 0]} text={t.root} style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> },
          { id: 'top', content: <Node position={[0, 0]} text={t.current} style={{ fill: 'none', stroke: 'none' }} layout={{ padding: 0, margin: 0 }} /> },
        ]}
      />
      <NamespaceTable
        position={[20, 158]}
        title={t.map}
        rows={[
          { id: 'a-entry', key: 'a', value: '{ layout, state }', active: true },
          { id: 'b-entry', key: 'b', value: '{ layout, state }' },
        ]}
      />
      <NamespaceTable
        position={[342, 132]}
        title={t.record}
        keyWidth={136}
        valueWidth={176}
        rows={[
          { id: 'a-state', key: 'state', value: "'resolved'" },
          { id: 'a-layout', key: 'layout.rect', value: 'x: 40, y: 0' },
          { id: 'a-size', key: '↳ width / height', value: '60 / 32' },
          { id: 'a-shape', key: 'layout.shapeDef', value: 'rectangle' },
          { id: 'a-margin', key: 'layout.margin', value: '0' },
          { id: 'a-boundary', key: '…', value: '…' },
        ]}
      />
      <Draw way={['top.bottom', [250, 92], [125, 92], [125, 113]]} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['a-entry.right', [330, 158]]} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[284, 140]} text={t.reference} secondary />
      <Node
        id="measured-a"
        position={[128, 280]}
        text={['a: rect(40, 0, 60, 32)', t.source]}
        style={{ fill: 'none', stroke: 'none', font: { size: 13 } }}
      />
      <Draw way={['measured-a.left', [-8, 280], [-8, 158], 'a-entry-key.left']} arrow="->" style={{ stroke: 'gray' }} />
      <NamespaceCaption position={[120, 228]} text={t.write} secondary />
      <NamespaceCaption position={[325, 365]} text={t.note} secondary />
    </Layout>
  );
};
export default NamespaceStorage;
