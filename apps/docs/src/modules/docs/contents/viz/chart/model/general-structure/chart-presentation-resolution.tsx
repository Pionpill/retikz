import { Draw, Layout } from '@retikz/react';
import { List, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { chartPresentationResolutionI18n } from './chart-presentation-resolution.i18n';

/** Presentation 编写态与解析结果示意图的语言参数 */
export type ChartPresentationResolutionProps = Readonly<{ lang?: Lang }>;

/** 对照无序 Source 槽位与解析后包含 Plot 的固定 Flex 顺序 */
const ChartPresentationResolution: FC<ChartPresentationResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const t = chartPresentationResolutionI18n[lang];
  const label = (text: string) => ({ text, position: 'top' as const, distance: 18, font: { size: 12 } });

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        id="source-presentation"
        transforms={[{ kind: 'translate', x: 12, y: 24 }]}
        label={label(t.source)}
        layout={{ height: 30, padding: 0, key: { width: 80 }, value: { width: 190 } }}
        style={{ font: { size: 13 } }}
        entries={[
          { key: 'note', value: t.note },
          { key: 'title', value: t.title },
          { key: 'source', value: t.dataSource },
          { key: 'subtitle', value: t.subtitle },
        ]}
      />
      <List
        id="resolved-flex"
        transforms={[{ kind: 'translate', x: 435, y: 12 }]}
        label={label(t.resolved)}
        layout={{ direction: 'column', height: 30, width: 145, padding: 0 }}
        style={{ font: { size: 13 } }}
        items={[
          'title',
          'subtitle',
          { content: 'plot', style: { fill: 'dodgerblue', fillOpacity: 0.14 } },
          'note',
          'source',
        ]}
      />
      <Draw way={['source-presentation.right', 'resolved-flex.left']} arrow="->" />
    </Layout>
  );
};

export default ChartPresentationResolution;
