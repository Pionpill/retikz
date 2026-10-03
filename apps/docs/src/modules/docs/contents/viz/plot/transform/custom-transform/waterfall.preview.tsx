import { IntervalMark, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { waterfallOperationOf } from './waterfall.controls';
import { waterfallRows } from './waterfall.data';
import { waterfallTransform, waterfallTransformImplementation } from './waterfall.definition';

/** 图形参数 */
export type WaterfallPreviewValues = {
  'custom-transform-initial-value': number;
};

/** 绘制示例图形 */
export const WaterfallPreview = (values: WaterfallPreviewValues) => (
  <Layout viewBox={{ x: -15, y: -15, width: 450, height: 290 }}>
    <Plot
      data={waterfallRows}
      width={420}
      height={260}
      plotDefaults={{ palette: { categorical: ['#16a34a', '#dc2626'] } }}
      transformDefinitions={[waterfallTransform]}
      transformImplementations={[waterfallTransformImplementation]}
    >
      <PlotTransform operation={{ ...waterfallOperationOf(values) }} />
      <PlotScale dimension="x" type="band" paddingInner={0.2} paddingOuter={0.08} />
      <PlotScale dimension="y" type="linear" domain={[-20, 160]} domainPadding={0} />
      <IntervalMark x="period" color="direction" bounds={{ y: { kind: 'extent', from: 'from', to: 'to' } }} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  </Layout>
);
