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
  const mapLayout = { height: 34, padding: 0, key: { width: 48 }, value: { width: 102 } } as const;

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="dataset-a"
        position={[12, 28]}
        label={label(t.sourceA)}
        layout={mapLayout}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: '2' },
          { key: 'y', value: '4' },
        ]}
      />
      <Map
        id="dataset-b"
        position={[12, 194]}
        label={label(t.sourceB)}
        layout={mapLayout}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'a', value: '3' },
          { key: 'b', value: '"5"' },
        ]}
      />
      <Map
        id="adapter-a"
        position={[280, 28]}
        label={label(t.adapterA)}
        layout={{ height: 34, padding: 0, key: { width: 48 }, value: { width: 145 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'x · continuous' },
          { key: 'y', value: 'y · continuous' },
        ]}
      />
      <Map
        id="adapter-b"
        position={[280, 194]}
        label={label(t.adapterB)}
        layout={{ height: 34, padding: 0, key: { width: 48 }, value: { width: 145 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'a · continuous' },
          { key: 'y', value: 'b · numberString' },
        ]}
      />
      <Map
        id="chart-encodings"
        position={[630, 111]}
        label={label(t.chart)}
        layout={{ height: 34, padding: 0, key: { width: 45 }, value: { width: 45 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'x' },
          { key: 'y', value: 'y' },
        ]}
      />
      <Draw way={['dataset-a.right', 'adapter-a.left']} arrow="->" />
      <Draw way={['dataset-b.right', 'adapter-b.left']} arrow="->" />
      <Draw way={['adapter-a.right', '-|-', 'chart-encodings.left']} arrow="->" />
      <Draw way={['adapter-b.right', '-|-', 'chart-encodings.left']} arrow="->" />
    </Layout>
  );
};

export default ChartDataModelBridge;
