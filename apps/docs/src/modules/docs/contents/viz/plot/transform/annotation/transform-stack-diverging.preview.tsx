import { IntervalMark, Plot, PlotAxis, BuiltinPlotScale, PlotTransform } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { stackDivergingOperation } from './transform-stack-diverging.controls';
import { signedProductChange } from './transform-stack-diverging.data';
import { transformStackDivergingI18n } from './transform-stack-diverging.i18n';

/** 展示正负数值分别向零线两侧堆叠 */
export const TransformStackDivergingPreview = (lang: Lang) => {
  const i18n = transformStackDivergingI18n[lang];
  return (
    <Plot data={signedProductChange} width={420} height={260}>
      <PlotTransform operation={{ ...stackDivergingOperation }} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[-45, 70]} />
      <IntervalMark x="quarter" color="product" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
      <PlotAxis dimension="x" title={i18n.quarter} />
      <PlotAxis dimension="y" title={i18n.change} grid />
    </Plot>
  );
};
