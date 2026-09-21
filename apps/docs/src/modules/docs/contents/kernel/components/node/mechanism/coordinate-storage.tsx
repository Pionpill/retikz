import { Draw, Layout, Node } from '@retikz/react';
import { Map } from '@retikz/standard-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { coordinateStorageI18n } from './coordinate-storage.i18n';

/** 坐标点记录图的语言 */
export type CoordinateStorageProps = { lang?: Lang };

/** 展示坐标点输入、零尺寸命名记录和查询结果 */
const CoordinateStorage: FC<CoordinateStorageProps> = props => {
  const { lang = 'zh' } = props;
  const t = coordinateStorageI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="input"
        transforms={[{ kind: 'translate', x: 20, y: 35 }]}
        label={{ text: t.input, opacity: 0.8, font: { size: 12 } }}
        data={{ id: 'hub', position: [40, 20] }}
        layout={{ height: 30, padding: 4 }}
        style={{ font: { size: 13 } }}
      />
      <Map
        transforms={[{ kind: 'translate', x: 20, y: 175 }]}
        label={{ text: t.map, position: 'bottom', opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 60 }, value: { width: 145 } }}
        style={{ fill: 'dodgerblue', font: { size: 13 } }}
        entries={[{ key: { id: 'hub-key', content: 'hub' }, value: { id: 'hub-entry', content: '{ layout, state }' } }]}
      />
      <Map
        id="record"
        transforms={[{ kind: 'translate', x: 410, y: 35 }]}
        label={{ text: t.record, opacity: 0.8, font: { size: 12 } }}
        layout={{ padding: 6 }}
        style={{ font: { size: 13 } }}
        data={{ state: 'resolved', layout: { rect: { x: 40, y: 20, width: 0, height: 0 } } }}
      />
      <Node
        id="result"
        position={[130, 290]}
        text="[40, 20]"
        cornerRadius={8}
        label={{ text: t.result, position: 'bottom', textColor: 'gray', font: { size: 12 } }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.14, stroke: 'none', font: { size: 13 } }}
      />
      <Draw
        way={[
          'input.bottom',
          { verticalTo: [0, 120] },
          { horizontalTo: 'hub-key.top' },
          { label: { text: t.register, side: 'right', textColor: 'gray', font: { size: 12 } } },
          { verticalTo: 'hub-key.top' },
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'hub-entry.right',
          { label: { text: t.expand, textColor: 'gray', font: { size: 12 } } },
          { horizontalTo: 'record.left' },
        ]}
        arrow="->"
      />
      <Draw
        way={[
          'record.bottom',
          { verticalTo: [0, 290] },
          { label: { text: t.lookup, textColor: 'gray', font: { size: 12 } } },
          'result.right',
        ]}
        arrow="->"
      />
      <Node
        position={[320, 355]}
        text={t.note}
        style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};

export default CoordinateStorage;
