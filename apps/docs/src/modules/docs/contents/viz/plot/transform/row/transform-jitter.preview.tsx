import { Plot, PlotAxis, BuiltinPlotScale, PlotTransform, PointMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { jitterOperationOf } from './transform-jitter.controls';
import { samples } from './transform-jitter.data';
import { transformJitterI18n } from './transform-jitter.i18n';

/** 图形参数 */
export type TransformJitterPreviewValues = {
  amount: number;
  seed: number;
};

/** 绘制示例图形 */
export const TransformJitterPreview = (values: TransformJitterPreviewValues, lang: Lang) => {
  const i18n = transformJitterI18n[lang];
  return (
    <Plot data={samples} width={420} height={260}>
      <PlotTransform operation={{ ...jitterOperationOf(values) }} />
      <BuiltinPlotScale dimension="x" type="linear" domain={[0.5, 3.5]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[10, 32]} />
      <PointMark x="dose" y="response" />
      <PlotAxis dimension="x" title={i18n.jittered} />
      <PlotAxis dimension="y" title={i18n.response} grid />
    </Plot>
  );
};
