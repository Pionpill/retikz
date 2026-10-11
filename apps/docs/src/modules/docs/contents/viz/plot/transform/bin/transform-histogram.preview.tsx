import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { histogramOperationOf } from './transform-histogram.controls';
import { measurements } from './transform-histogram.data';
import { transformHistogramI18n } from './transform-histogram.i18n';

/** 图形参数 */
export type TransformHistogramPreviewValues = {
  strategy: 'count' | 'step' | 'thresholds';
  count: number;
  step: number;
  thresholdPreset: 'regular' | 'focused';
};

/** 绘制示例图形 */
export const TransformHistogramPreview = (values: TransformHistogramPreviewValues, lang: Lang) => {
  const i18n = transformHistogramI18n[lang];
  return (
    <Plot data={measurements} width={420} height={260}>
      <PlotTransform operation={{ ...histogramOperationOf(values) }} />
      <BuiltinPlotScale dimension="x" type="linear" domain={[0, 20]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[0, 25]} />
      <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      <PlotAxis dimension="x" title={i18n.measurement} />
      <PlotAxis dimension="y" title={i18n.frequency} grid />
    </Plot>
  );
};
