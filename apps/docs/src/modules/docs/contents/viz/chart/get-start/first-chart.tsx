import { ChartData, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { fertilityWorkData } from '../points/scatter/scatter-fertility-work.data';
import { firstChartI18n } from './first-chart.i18n';

/** 首张图形示例的语言选项 */
export type FirstChartProps = { lang?: Lang };

/** 使用真实经济体数据展示字段映射与公共组件写法 */
const FirstChart: FC<FirstChartProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = firstChartI18n[lang];
  return (
    <ScatterChart
      recipe={{
        encodings: { x: 'fertilityRate', y: 'femaleLaborParticipation', color: 'incomeGroup' },
        properties: { size: 5, opacity: 0.7 },
      }}
    >
      <ChartData data={fertilityWorkData} />
      <ChartLayout width={720} height={440} />
      <ChartTitle>{i18n.title}</ChartTitle>
      <ChartSubtitle>{i18n.subtitle}</ChartSubtitle>
      <ChartSource>{i18n.source}</ChartSource>
    </ScatterChart>
  );
};

/** 源码视图复用散点图的经济体数据 */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'fertilityWorkData', from: '../points/scatter/scatter-fertility-work.data' },
  },
};

export default FirstChart;
