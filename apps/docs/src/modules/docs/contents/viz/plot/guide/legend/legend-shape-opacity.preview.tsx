import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { legendShapeOpacityI18n } from './legend-shape-opacity.i18n';
import { cities } from './legend.data';

/** 图形参数 */
export type LegendShapeOpacityPreviewValues = {
  showShape: boolean;
  shapePosition: 'right' | 'left' | 'top' | 'bottom';
  showOpacity: boolean;
  opacityPosition: 'right' | 'left' | 'top' | 'bottom';
  tickCount: number;
};

/** 绘制示例图形 */
export const LegendShapeOpacityPreview = (values: LegendShapeOpacityPreviewValues, lang: Lang) => {
  const i18n = legendShapeOpacityI18n[lang];
  return (
    <Plot
      data={cities}
      model={[
        { name: 'lng', type: 'continuous' },
        { name: 'lat', type: 'continuous' },
        { name: 'region', type: 'categorical' },
        { name: 'pop', type: 'continuous' },
      ]}
      width={380}
      height={280}
    >
      <PointMark
        encodings={{
          shape: 'region',
          opacity: { overall: 'pop' },
          position: { x: { field: 'lng' }, y: { field: 'lat' } },
        }}
      />
      {values.showShape ? <PlotLegend channel="shape" position={values.shapePosition} title={i18n.region} /> : null}
      {values.showOpacity ? (
        <PlotLegend
          channel="opacity"
          position={values.opacityPosition}
          ticks={{ count: values.tickCount }}
          title={i18n.population}
        />
      ) : null}
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
