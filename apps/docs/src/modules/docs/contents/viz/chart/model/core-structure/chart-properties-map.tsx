import { Draw, Layout, Node } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { chartPropertiesMapI18n } from './chart-properties-map.i18n';

/** 类型特有属性示意图的语言参数 */
export type ChartPropertiesMapProps = Readonly<{ lang?: Lang }>;

/** 对比 Strip 和 Regression 属性所控制的具体绘制行为 */
const ChartPropertiesMap: FC<ChartPropertiesMapProps> = props => {
  const { lang = 'zh' } = props;
  const t = chartPropertiesMapI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, distance: 18, font: { size: 12 } });

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="strip-properties"
        position={[12, 28]}
        label={label(t.strip)}
        entries={[
          { key: 'jitter', value: '{ span: { kind: "ratio", value: 0.3 } }' },
          { key: 'opacity', value: '0.8' },
        ]}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { height: 34, padding: 0 },
          key: { layout: { width: 72 } },
          value: { layout: { width: 238 } },
        }}
      />
      <Map
        id="regression-properties"
        position={[12, 177]}
        label={label(t.regression)}
        entries={[
          { key: 'method', value: '{ kind: "linear" }' },
          { key: 'opacity', value: '0.8' },
        ]}
        defaultCell={{
          style: { font: { size: 13 } },
          layout: { height: 34, padding: 0 },
          key: { layout: { width: 90 } },
          value: { layout: { width: 220 } },
        }}
      />
      <Node id="strip-result" position={[540, 64]} cornerRadius={4}>
        {t.spread}
      </Node>
      <Node id="regression-result" position={[540, 213]} cornerRadius={4}>
        {t.fitting}
      </Node>
      <Draw way={['strip-properties.right', 'strip-result.left']} arrow="->" />
      <Draw way={['regression-properties.right', 'regression-result.left']} arrow="->" />
    </Layout>
  );
};

export default ChartPropertiesMap;
