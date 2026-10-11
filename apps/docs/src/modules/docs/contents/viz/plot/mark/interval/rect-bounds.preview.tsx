import { IntervalMark, PlotAxis, BuiltinPlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { matrix } from './rect-heatmap.data';

/** 图形参数 */
export type RectBoundsPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  showColor: boolean;
  mode: 'band' | 'full';
};

/** 绘制示例图形 */
export const RectBoundsPreview = (values: RectBoundsPreviewValues) => (
  <Layout viewBox={{ x: -16, y: -16, width: 412, height: 312 }}>
    <Plot
      data={matrix}
      model={[
        { name: 'row', type: 'categorical' },
        { name: 'col', type: 'categorical' },
        { name: 'value', type: 'continuous' },
      ]}
      width={380}
      height={280}
      coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
    >
      <IntervalMark
        x="col"
        y="row"
        color={values.showColor ? 'value' : undefined}
        fill={values.showColor ? undefined : '#60a5fa'}
        bounds={{
          x: { kind: 'band' },
          y: values.mode === 'band' ? { kind: 'band' } : { kind: 'full' },
        }}
      />
      <BuiltinPlotScale dimension="x" type="band" paddingOuter={0.15} />
      <BuiltinPlotScale dimension="y" type="band" paddingOuter={0} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" />
    </Plot>
  </Layout>
);
