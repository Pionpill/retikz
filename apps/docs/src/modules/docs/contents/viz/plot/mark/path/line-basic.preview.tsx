import { PathMark, Plot, PlotAxis } from '@retikz/plot-react';

import { revenue } from './line-basic.data';

/** 图形参数 */
export type LineBasicPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  xField: 'coordinate' | 'month' | 'period';
  yField: 'revenue' | 'month';
  orderSource: 'field' | 'data';
  closed: boolean;
};

/** 绘制示例图形 */
export const LineBasicPreview = (values: LineBasicPreviewValues) => {
  const coordinate = values.coordinate;
  const xField = values.xField;
  const yField = values.yField;
  const x = xField === 'coordinate' ? (coordinate === 'polar2D' ? 'period' : 'month') : xField;
  const order = values.orderSource === 'field' ? 'month' : undefined;

  return (
    <Plot data={revenue} width={400} height={280} coordinate={coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PathMark x={x} y={yField} order={order} closed={coordinate === 'polar2D' && values.closed} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
