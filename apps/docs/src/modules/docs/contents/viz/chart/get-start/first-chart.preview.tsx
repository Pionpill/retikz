import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { fertilityWorkData } from '../points/scatter/scatter-fertility-work.data';
import { firstChartI18n } from './first-chart.i18n';

/** 首张图形的语言和布局输入 */
export type FirstChartPreviewOptions = {
  lang: Lang;
  layout?: ScatterChartProps['layout'];
};

/** 展示生育率与女性劳动参与率的散点图 */
export const renderFirstChartPreview = (options: FirstChartPreviewOptions) => {
  const { lang, layout } = options;
  const i18n = firstChartI18n[lang];
  return (
    <ScatterChart
      {...(layout ? { layout } : {})}
      recipe={{
        encodings: { x: 'fertilityRate', y: 'femaleLaborParticipation', color: 'incomeGroup' },
        properties: { size: 5, opacity: 0.7 },
      }}
    >
      <ChartData data={fertilityWorkData} />
      {layout ? null : <ChartLayout width={720} height={440} />}
      <ChartTitle>{i18n.title}</ChartTitle>
      <ChartSubtitle>{i18n.subtitle}</ChartSubtitle>
      <ChartSource>{i18n.source}</ChartSource>
    </ScatterChart>
  );
};
