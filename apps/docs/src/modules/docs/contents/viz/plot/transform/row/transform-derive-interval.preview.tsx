import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { deriveIntervalOperationOf } from './transform-derive-interval.controls';
import { tasks } from './transform-derive-interval.data';
import { transformDeriveIntervalI18n } from './transform-derive-interval.i18n';

/** 图形参数 */
export type TransformDeriveIntervalPreviewValues = {
  mode: 'baseline' | 'fields';
  baseline: number;
};

/** 绘制示例图形 */
export const TransformDeriveIntervalPreview = (values: TransformDeriveIntervalPreviewValues, lang: Lang) => {
  const i18n = transformDeriveIntervalI18n[lang];
  return (
    <Plot data={tasks} width={420} height={260}>
      <PlotTransform operation={{ ...deriveIntervalOperationOf(values) }} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[0, 12]} />
      <IntervalMark x="task" color="phase" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
      <PlotAxis dimension="x" title={i18n.task} />
      <PlotAxis dimension="y" title={i18n.progress} grid />
    </Plot>
  );
};
