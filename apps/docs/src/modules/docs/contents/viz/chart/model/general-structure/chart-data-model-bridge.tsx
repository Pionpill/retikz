import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { chartDataModelBridgeI18n } from './chart-data-model-bridge.i18n';

/** 数据字段对齐示意图的语言参数 */
export type ChartDataModelBridgeProps = Readonly<{ lang?: Lang }>;

/** 展示不同物理字段经 model 与 fieldMap 对齐到同一 Chart 逻辑字段 */
const ChartDataModelBridge: FC<ChartDataModelBridgeProps> = props => {
  const { lang = 'zh' } = props;
  const t = chartDataModelBridgeI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, distance: 18, font: { size: 12 } });
  const defaultCell = {
    style: { font: { size: 13 } },
    layout: { height: 34, padding: 0 },
    key: { layout: { width: 48 } },
    value: { layout: { width: 102 } },
  } as const;

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="dataset-a"
        position={[12, 28]}
        label={label(t.sourceA)}
        entries={[
          { key: 'x', value: '2' },
          { key: 'y', value: '4' },
        ]}
        defaultCell={defaultCell}
      />
      <Map
        id="dataset-b"
        position={[12, 194]}
        label={label(t.sourceB)}
        entries={[
          { key: 'a', value: '3' },
          { key: 'b', value: '"5"' },
        ]}
        defaultCell={defaultCell}
      />
      <Map
        id="adapter-a"
        position={[280, 28]}
        label={label(t.adapterA)}
        entries={[
          { key: 'x', value: 'x · continuous' },
          { key: 'y', value: 'y · continuous' },
        ]}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { height: 34, padding: 0 },
          key: { layout: { width: 48 } },
          value: { layout: { width: 145 } },
        }}
      />
      <Map
        id="adapter-b"
        position={[280, 194]}
        label={label(t.adapterB)}
        entries={[
          { key: 'x', value: 'a · continuous' },
          { key: 'y', value: 'b · numberString' },
        ]}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { height: 34, padding: 0 },
          key: { layout: { width: 48 } },
          value: { layout: { width: 145 } },
        }}
      />
      <Map
        id="chart-encodings"
        position={[630, 111]}
        label={label(t.chart)}
        entries={[
          { key: 'x', value: 'x' },
          { key: 'y', value: 'y' },
        ]}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { height: 34, padding: 0 },
          key: { layout: { width: 45 } },
          value: { layout: { width: 45 } },
        }}
      />
      <Draw way={['dataset-a.right', 'adapter-a.left']} arrow="->" />
      <Draw way={['dataset-b.right', 'adapter-b.left']} arrow="->" />
      <Draw way={['adapter-a.right', '-|-', 'chart-encodings.left']} arrow="->" />
      <Draw way={['adapter-b.right', '-|-', 'chart-encodings.left']} arrow="->" />
    </Layout>
  );
};

export default ChartDataModelBridge;
