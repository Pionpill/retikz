import { IntervalMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

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
export const TransformStackPreview = (
  values: TransformStackPreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformStackI18n[lang];
  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={productRevenue}
      width={420}
      height={260}
    >
      <PlotTransform operation={{ ...stackOperationOf(values) }} />
      <PlotScale dimension="y" type="linear" domain={yDomainByOffset[values.offset]} />
      <IntervalMark
        encodings={{
          color: 'product',
          bounds: { y: { from: { field: 'y0' }, to: { field: 'y1' } } },
          position: { x: { field: 'quarter' } },
        }}
        properties={{ bounds: { y: { kind: 'extent' } }, opacity: { overall: values.offset === 'overlap' ? 0.6 : 1 } }}
      />
      <PlotAxis dimension="x" title={i18n.quarter} />
      <PlotAxis dimension="y" title={values.offset === 'normalize' ? i18n.share : i18n.revenue} grid />
    </Plot>
  );
};
