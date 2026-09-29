import { RegressionChart } from '@retikz/chart-react/point';

import type { Lang } from '@/i18n';

import { irisRegressionData } from './regression-basic.data';
import { regressionCompareI18n } from './regression-compare.i18n';

/** 图形参数 */
export type RegressionComparePreviewValues = {
  sampleCount: number;
  size: number;
  opacity: number;
  curve: 'linear' | 'catmullRom';
  linearColor: string;
  strokeWidth: number;
  order: number;
  polynomialColor: string;
  dashed: boolean;
};

/** 绘制示例图形 */
export const renderRegressionComparePreview = (
  lang: Lang,
  dimensions: { width: number; height: number } | undefined,
  values: RegressionComparePreviewValues,
) => {
  const text = regressionCompareI18n[lang];
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <RegressionChart
      rows={irisRegressionData}
      layout={bounds}
      presentation={{ title: { text: text.title }, subtitle: { text: text.subtitle } }}

      recipe={{
        encodings: { x: 'sepalLengthCm', y: 'petalLengthCm' },
        properties: {
          sampleCount: values.sampleCount,
          point: { size: values.size, opacity: values.opacity },
          trend: { curve: values.curve, stroke: values.linearColor, strokeWidth: values.strokeWidth },
          extraMethods: [
            {
              method: { kind: 'polynomial', order: values.order },
              trend: { stroke: values.polynomialColor, dashPattern: values.dashed ? [6, 4] : [] },
            },
          ],
        },
      }}
    />
  );
  return chart;
};
