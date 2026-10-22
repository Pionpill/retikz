import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { normalizeOperationsOf } from './transform-normalize.controls';
import { revenue } from './transform-normalize.data';
import { transformNormalizeI18n } from './transform-normalize.i18n';

/** 图形参数 */
export type TransformNormalizePreviewValues = {
  basis: 'fraction' | 'percent';
  grouping: 'quarter' | 'global';
};

/** 绘制示例图形 */
export const TransformNormalizePreview = (
  values: TransformNormalizePreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformNormalizeI18n[lang];
  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={revenue}
      width={420}
      height={260}
    >
      {normalizeOperationsOf(values).map((operation, index) => (
        <PlotTransform key={index} operation={{ ...operation }} />
      ))}
      <PlotScale dimension="y" type="linear" domain={values.basis === 'percent' ? [0, 100] : [0, 1]} />
      <IntervalMark
        stack
        encodings={{ series: 'product', position: { x: { field: 'quarter' }, y: { field: 'share' } } }}
      />
      <PlotAxis dimension="x" title={i18n.quarter} />
      <PlotAxis dimension="y" title={values.basis === 'percent' ? i18n.share : i18n.share2} grid />
    </Plot>
  );
};
