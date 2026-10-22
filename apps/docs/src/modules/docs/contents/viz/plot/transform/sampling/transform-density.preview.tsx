import { PathMark, Plot, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { densityOperationOf } from './transform-density.controls';
import { measurements } from './transform-density.data';
import { transformDensityI18n } from './transform-density.i18n';

/** 图形参数 */
export type TransformDensityPreviewValues = {
  bandwidthMode: 'value' | 'silverman';
  bandwidth: number;
  sampleCount: number;
};

/** 绘制示例图形 */
export const TransformDensityPreview = (
  values: TransformDensityPreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformDensityI18n[lang];
  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={measurements}
      width={440}
      height={260}
    >
      <PlotTransform operation={{ ...densityOperationOf(values) }} />
      <PlotScale dimension="x" type="linear" domain={[1, 10]} />
      <PlotScale dimension="y" type="linear" domain={[0, 0.7]} />
      <PathMark
        encodings={{
          series: 'group',
          color: 'group',
          order: 'densityX',
          position: { x: { field: 'densityX' }, y: { field: 'density' } },
        }}
        properties={{ closure: { kind: 'baseline', baseline: 0 }, fill: 'dodgerblue', strokeWidth: 2.2 }}
      />
      <PlotAxis dimension="x" title={i18n.measurement} />
      <PlotAxis dimension="y" title={i18n.density} grid />
    </Plot>
  );
};
