import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { chartEncodingsMapI18n } from './chart-encodings-map.i18n';

/** 数据通道示意图的语言参数 */
export type ChartEncodingsMapProps = Readonly<{ lang?: Lang }>;

/** 展示 Scatter 将数据字段绑定至最终图元通道 */
const ChartEncodingsMap: FC<ChartEncodingsMapProps> = props => {
  const { lang = 'zh' } = props;
  const t = chartEncodingsMapI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, distance: 18, font: { size: 12 } });

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="encoding-data"
        position={[12, 28]}
        label={label(t.data)}
        layout={{ height: 34, padding: 0, key: { width: 90 }, value: { width: 70 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'weight', value: '2.0' },
          { key: 'efficiency', value: '4.2' },
          { key: 'group', value: '"A"' },
        ]}
      />
      <Map
        id="encoding-recipe"
        position={[260, 28]}
        label={label(t.encodings)}
        layout={{ height: 34, padding: 0, key: { width: 60 }, value: { width: 100 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: 'weight' },
          { key: 'y', value: 'efficiency' },
          { key: 'color', value: 'group' },
        ]}
      />
      <Map
        id="encoding-mark"
        position={[508, 28]}
        label={label(t.mark)}
        layout={{ height: 34, padding: 0, key: { width: 60 }, value: { width: 130 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'x', value: '2.0' },
          { key: 'y', value: '4.2' },
          { key: 'color', value: 'scale("A")' },
        ]}
      />
      <Draw way={['encoding-data.right', 'encoding-recipe.left']} arrow="->" />
      <Draw way={['encoding-recipe.right', 'encoding-mark.left']} arrow="->" />
    </Layout>
  );
};

export default ChartEncodingsMap;
