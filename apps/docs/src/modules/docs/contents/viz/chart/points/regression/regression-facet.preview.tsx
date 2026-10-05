import { RegressionChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { irisRegressionData } from './regression-basic.data';
import { regressionFacetI18n } from './regression-facet.i18n';

/** 图形参数 */
export type RegressionFacetPreviewValues = {
  header: boolean;
  panelGap: number;
  size: number;
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderRegressionFacetPreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
  values: RegressionFacetPreviewValues,
) => {
  const text = regressionFacetI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 568 };

  const chart = (
    <RegressionChart
      rows={irisRegressionData}
      layout={{ ...bounds, padding: { right: 48, bottom: 32 } }}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: {
          x: 'sepalLengthCm',
          y: 'petalLengthCm',
          series: 'species',
          row: 'species',
          facet: { header: { row: values.header }, spacing: { panelGap: values.panelGap } },
        },
        properties: { point: { size: values.size, opacity: 0.5 }, trend: { strokeWidth: values.strokeWidth } },
      }}
    />
  );

  return chart;
};
