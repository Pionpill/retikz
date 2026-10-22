import type { Side } from '@retikz/core';
import { PathMark, Plot, PlotAxis } from '@retikz/plot-react';

import { climate } from './line-series.data';

/** 图形参数 */
export type LineSeriesPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  grouping: 'color' | 'series' | 'none';
  showLabels: boolean;
  closed: boolean;
  position: number;
  side: Side | 'auto';
  sloped: boolean;
  interrupt: boolean;
  distance: number;
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
        encodings={{
          order: 'month',
          ...(grouping === 'series' ? { series: 'city' } : {}),
          ...(grouping === 'color' ? { color: 'city' } : {}),
          ...(grouped && values.showLabels ? { label: { content: 'city' } } : {}),
          position: { x: { field: x }, y: { field: 'score' } },
        }}
        properties={{
          label:
            grouped && values.showLabels
              ? {
                  position: values.position,
                  ...(values.side === 'auto' ? {} : { side: values.side }),
                  sloped: values.sloped,
                  interrupt: values.interrupt,
                  distance: values.distance,
                }
              : undefined,
          closed: coordinate === 'polar2D' && values.closed,
        }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
