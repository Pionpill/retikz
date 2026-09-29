import { PathMark, Plot, PlotAxis } from '@retikz/plot-react';

import { climate } from './line-series.data';

/** 图形参数 */
export type LineSeriesPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  grouping: 'color' | 'series' | 'none';
  showLabels: boolean;
  closed: boolean;
};

/** 绘制示例图形 */
export const LineSeriesPreview = (values: LineSeriesPreviewValues) => {
  const coordinate = values.coordinate;
  const grouping = values.grouping;
  const x = coordinate === 'polar2D' ? 'quarter' : 'month';
  const grouped = grouping !== 'none';

  return (
    <Plot data={climate} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PathMark
        x={x}
        y="score"
        order="month"
        series={grouping === 'series' ? 'city' : undefined}
        color={grouping === 'color' ? 'city' : undefined}
        label={
          grouped && values.showLabels
            ? { content: { field: 'city' }, position: 'near-end', side: 'top', distance: 6 }
            : undefined
        }
        closed={coordinate === 'polar2D' && values.closed}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
