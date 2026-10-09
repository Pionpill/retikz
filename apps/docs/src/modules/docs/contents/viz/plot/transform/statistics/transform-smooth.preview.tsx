import { PathMark, Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { smoothOperationsOf } from './transform-smooth.controls';
import { trendSamples } from './transform-smooth.data';
import { transformSmoothI18n } from './transform-smooth.i18n';

/** 图形参数 */
export type TransformSmoothPreviewValues = {
  sampleCount: number;
  extentMode: 'observed' | 'extend';
};

/** 绘制示例图形 */
export const TransformSmoothPreview = (values: TransformSmoothPreviewValues, lang: Lang) => {
  const i18n = transformSmoothI18n[lang];
  const smoothTransform = smoothOperationsOf(values);

  return (
    <Plot data={trendSamples} width={440} height={260}>
      <BuiltinPlotScale dimension="x" type="linear" domain={[-1, 5]} />
      <BuiltinPlotScale dimension="y" type="linear" domain={[0, 10]} />
      <PointMark color="series" fillOpacity={0.72} x="time" y="value" />
      <PathMark
        color="series"
        order="trendX"
        series="series"
        strokeWidth={2.4}
        transform={smoothTransform.map(operation => ({ operation }))}
        x="trendX"
        y="trendY"
      />
      <PointMark
        fill={{ kind: 'constant', value: 'white' }}
        size={3.5}
        stroke="series"
        strokeWidth={1}
        transform={smoothTransform.map(operation => ({ operation }))}
        x="trendX"
        y="trendY"
      />
      <PlotAxis dimension="x" title={i18n.time} />
      <PlotAxis dimension="y" title={i18n.value} grid />
    </Plot>
  );
};
