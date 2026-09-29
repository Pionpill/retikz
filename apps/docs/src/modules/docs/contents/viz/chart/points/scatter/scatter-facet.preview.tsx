import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart } from '@retikz/chart-react/point';

import { scatterFacetI18n } from './scatter-facet.i18n';
import { fertilityWorkData } from './scatter-fertility-work.data';

/** 分面散点图的图表输入 */
export type ScatterFacetPreviewOptions = {
  lang: keyof typeof scatterFacetI18n;
  layout: ScatterChartProps['layout'];
  header: boolean;
  panelGap: number;
  size: number;
  opacity: number;
};

/** 按收入组分面并保持共享位置尺度 */
export const renderScatterFacetPreview = (options: ScatterFacetPreviewOptions) => {
  const { lang, layout, header, panelGap, size, opacity } = options;
  const i18n = scatterFacetI18n[lang];
  return (
    <ScatterChart
      rows={fertilityWorkData}
      layout={layout}
      presentation={{ title: { text: i18n.title }, subtitle: { text: i18n.subtitle } }}
      recipe={{
        encodings: {
          x: 'fertilityRate',
          y: 'femaleLaborParticipation',
          column: { field: 'incomeGroup', order: ['HIC', 'UMC', 'LMC', 'LIC'] },
          facet: { header: { column: header }, spacing: { panelGap } },
        },
        properties: { size, opacity },
      }}
    />
  );
};
