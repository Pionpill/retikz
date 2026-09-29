import { IntervalMark, PlotAxis, PlotScale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { sales } from './bar-grouped.data';

/** 图形参数 */
export type BarSeriesPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  mode: 'stack' | 'dodge' | 'normalize-stack';
  stackOffset: 'zero' | 'normalize' | 'diverging' | 'center' | 'overlap';
  gap: number;
};

/** 绘制示例图形 */
export const BarSeriesPreview = (values: BarSeriesPreviewValues) => {
  const isPolar = values.coordinate === 'polar2D';

  return (
    <Layout viewBox={{ x: -16, y: -16, width: 432, height: 312 }}>
      <Plot data={sales} width={400} height={280} coordinate={isPolar ? 'polar2D' : undefined}>
        <IntervalMark
          x="quarter"
          y="revenue"
          group="product"
          color="product"
          arrangement={values.mode}
          stackOffset={values.mode === 'stack' ? values.stackOffset : undefined}
        />
        <PlotScale dimension="x" type="band" paddingInner={values.gap} paddingOuter={isPolar ? values.gap / 2 : 0.15} />
        <PlotScale dimension="y" type="linear" domainPadding={0} />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
};
