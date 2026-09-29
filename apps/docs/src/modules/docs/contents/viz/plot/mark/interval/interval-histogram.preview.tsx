import { IntervalMark, PlotAxis, PlotScale, PlotTransform } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

import { laborCosts } from './bar-variable-width.data';
import { intervalHistogramOperationOf, measurements } from './interval-histogram.data';

/** 图形参数 */
export type IntervalHistogramPreviewValues = {
  continuousCoordinate: 'cartesian2D' | 'polar2D';
  continuousHorizontalPadding: number;
  continuousVerticalPadding: number;
  continuousMode: 'histogram' | 'proportional';
  count: number;
};

/** 绘制示例图形 */
export const IntervalHistogramPreview = (values: IntervalHistogramPreviewValues) => {
  const coordinate = values.continuousCoordinate === 'polar2D' ? 'polar2D' : undefined;
  const xDomainPadding = {
    kind: 'ratio' as const,
    lower: values.continuousHorizontalPadding,
    upper: values.continuousHorizontalPadding,
  };
  const yDomainPadding = {
    kind: 'ratio' as const,
    lower: values.continuousVerticalPadding,
    upper: values.continuousVerticalPadding,
  };

  return (
    <Layout viewBox={{ x: -16, y: -16, width: 392, height: 312 }}>
      {values.continuousMode === 'histogram' ? (
        <Plot data={measurements} width={360} height={280} coordinate={coordinate}>
          <PlotTransform {...intervalHistogramOperationOf(values.count)} />
          <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
          <PlotScale dimension="x" type="linear" domainPadding={xDomainPadding} />
          <PlotScale dimension="y" type="linear" domainPadding={yDomainPadding} />
          <PlotAxis dimension="x" />
          <PlotAxis dimension="y" grid />
        </Plot>
      ) : (
        <Plot data={laborCosts} width={360} height={280} coordinate={coordinate}>
          <IntervalMark x="country" y="cost" width="gdp" color="country" />
          <PlotScale dimension="x" type="linear" domainPadding={xDomainPadding} />
          <PlotScale dimension="y" type="linear" domainPadding={yDomainPadding} />
          <PlotAxis dimension="x" />
          <PlotAxis dimension="y" grid />
        </Plot>
      )}
    </Layout>
  );
};
