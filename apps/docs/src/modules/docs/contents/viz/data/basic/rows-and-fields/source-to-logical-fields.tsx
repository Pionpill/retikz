import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { sourceToLogicalFieldsI18n } from './source-to-logical-fields.i18n';

/** 数据源与逻辑字段对照图的语言参数 */
export type SourceToLogicalFieldsProps = Readonly<{ lang?: Lang }>;

/** 展示两个可替换数据源如何形成相同的逻辑字段与数值 */
const SourceToLogicalFields: FC<SourceToLogicalFieldsProps> = props => {
  const { lang = 'zh' } = props;
  const t = sourceToLogicalFieldsI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="sales"
        transforms={[{ kind: 'translate', x: 15, y: 20 }]}
        label={{ text: t.sales, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 124 }, value: { width: 70 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: { content: 'region' }, value: { content: 'north' } },
          { key: { content: 'revenue' }, value: { content: '12' } },
        ]}
      />
      <Map
        id="forecast"
        transforms={[{ kind: 'translate', x: 15, y: 130 }]}
        label={{ text: t.forecast, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 124 }, value: { width: 70 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: { content: 'area' }, value: { content: 'north' } },
          { key: { content: 'pricing.amount' }, value: { content: '"12"' } },
        ]}
      />
      <Map
        id="normalized"
        transforms={[{ kind: 'translate', x: 255, y: 75 }]}
        label={{ text: t.normalized, opacity: 0.8, font: { size: 12 } }}
        layout={{ height: 32, padding: 0, key: { width: 124 }, value: { width: 70 } }}
        style={{ fill: 'dodgerblue', font: { size: 13 } }}
        entries={[
          { key: { content: 'region' }, value: { content: 'north' } },
          { key: { content: 'revenue' }, value: { content: '12' } },
        ]}
      />
      <Draw way={['sales.right', '-|-', 'normalized.left']} arrow="->" />
      <Draw way={['forecast.right', '-|-', 'normalized.left']} arrow="->" />
    </Layout>
  );
};

export default SourceToLogicalFields;
