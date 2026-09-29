import { Plot, PlotAxis, PlotLegend, PointMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { legendSizeI18n } from './legend-size.i18n';
import { cities } from './legend.data';

/** 图形参数 */
export type LegendSizePreviewValues = {
  position: 'right' | 'left' | 'top' | 'bottom';
  orient: 'auto' | 'vertical' | 'horizontal';
  symbolSize: number;
  symbolFit: 'fit' | 'preserve';
};

/** 绘制示例图形 */
export const LegendSizePreview = (values: LegendSizePreviewValues, lang: Lang) => {
  const i18n = legendSizeI18n[lang];
  return (
    <Plot
      data={cities}
      model={[
        { name: 'lng', type: 'continuous' },
        { name: 'lat', type: 'continuous' },
        { name: 'pop', type: 'continuous' },
      ]}
      width={360}
      height={260}
    >
      <PointMark x="lng" y="lat" size="pop" />
      <PlotLegend
        channel="size"
        position={values.position}
        orient={values.orient === 'auto' ? undefined : values.orient}
        title={i18n.population}
        style={{ symbolSize: values.symbolSize, symbolFit: values.symbolFit }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
