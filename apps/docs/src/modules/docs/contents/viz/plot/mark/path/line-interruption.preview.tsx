import { PathMark, Plot, PlotAxis, PlotLegend, PlotScale } from '@retikz/plot-react';

import { interruptedArea } from './line-interruption.data';

/** 图形参数 */
export type LineInterruptionPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  showFill: boolean;
  connectNulls: boolean;
  closed: boolean;
};

/** 绘制示例图形 */
export const LineInterruptionPreview = (values: LineInterruptionPreviewValues) => {
  const coordinate = values.coordinate;
  return (
    <Plot
      data={interruptedArea}
      width={400}
      height={280}
      coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}
      plotDefaults={{ palette: { categorical: ['#0f8f98', '#8cf27e'] } }}
    >
      <PlotScale dimension="x" type="linear" domainPadding={0} />
      <PlotScale dimension="y" type="linear" domainPadding={0} />
      {values.showFill ? (
        <PathMark
          x="year"
          y="amount"
          order="year"
          series="name"
          color="name"
          fill="name"
          closure={{ kind: 'baseline' }}
          closed={false}
          connectNulls={values.connectNulls}
          stroke="none"
          opacity={0.38}
        />
      ) : null}
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        closed={coordinate === 'polar2D' && values.closed}
        connectNulls={values.connectNulls}
        strokeWidth={2.4}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
      <PlotLegend channel="color" />
    </Plot>
  );
};
