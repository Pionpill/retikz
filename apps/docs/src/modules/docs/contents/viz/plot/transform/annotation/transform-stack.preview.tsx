import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { stackOperationOf } from './transform-stack.controls';
import { productRevenue } from './transform-stack.data';
import { transformStackI18n } from './transform-stack.i18n';

const yDomainByOffset: Record<string, [number, number]> = {
  zero: [0, 120],
  normalize: [0, 1],
  center: [-60, 60],
  overlap: [0, 120],
};

/** 图形参数 */
export type TransformStackPreviewValues = {
  offset: 'normalize' | 'zero' | 'center' | 'overlap';
};

/** 绘制示例图形 */
export const TransformStackPreview = (values: TransformStackPreviewValues, lang: Lang) => {
  const i18n = transformStackI18n[lang];
  return (
    <Plot data={productRevenue} width={420} height={260}>
      <PlotTransform operation={{ ...stackOperationOf(values) }} />
      <BuiltinPlotScale dimension="y" type="linear" domain={yDomainByOffset[values.offset]} />
      <IntervalMark
        x="quarter"
        color="product"
        bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }}
        opacity={values.offset === 'overlap' ? 0.6 : 1}
      />
      <PlotAxis dimension="x" title={i18n.quarter} />
      <PlotAxis dimension="y" title={values.offset === 'normalize' ? i18n.share : i18n.revenue} grid />
    </Plot>
  );
};
