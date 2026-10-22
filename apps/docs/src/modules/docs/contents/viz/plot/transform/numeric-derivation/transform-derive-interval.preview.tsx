import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

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
export const TransformDeriveIntervalPreview = (
  values: TransformDeriveIntervalPreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformDeriveIntervalI18n[lang];
  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={tasks}
      width={420}
      height={260}
    >
      <PlotTransform operation={{ ...deriveIntervalOperationOf(values) }} />
      <PlotScale dimension="y" type="linear" domain={[0, 12]} />
      <IntervalMark
        encodings={{
          color: 'phase',
          bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
          position: { x: { field: 'task' } },
        }}
        properties={{ bounds: { y: { kind: 'extent' } } }}
      />
      <PlotAxis dimension="x" title={i18n.task} />
      <PlotAxis dimension="y" title={i18n.progress} grid />
    </Plot>
  );
};
