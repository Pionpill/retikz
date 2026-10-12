import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import { positionRows } from './builtin-position.data';

/** 图形参数 */
export type BuiltinPositionPreviewValues = {
  xField: 'month' | 'sales' | 'profit' | 'orders' | 'averageOrder';
  yField: 'month' | 'sales' | 'profit' | 'orders' | 'averageOrder';
};

/** 绘制示例图形 */
export const BuiltinPositionPreview = (
  values: BuiltinPositionPreviewValues,
  dimensions?: { width: number; height: number },
) => (
  <Plot
    style={
      dimensions
        ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
        : undefined
    }
    data={positionRows}
    model={[
      { name: 'month', type: DataFieldType.Categorical },
      { name: 'sales', type: DataFieldType.Continuous },
      { name: 'profit', type: DataFieldType.Continuous },
      { name: 'orders', type: DataFieldType.Continuous },
      { name: 'averageOrder', type: DataFieldType.Continuous },
    ]}
    coordinate={{ type: 'cartesian2D' }}
    width={400}
    height={260}
  >
    {values.xField !== 'month' ? (
      <BuiltinPlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
    ) : null}
    {values.yField !== 'month' ? (
      <BuiltinPlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.15, upper: 0.15 }} />
    ) : null}
    <PointMark x={values.xField} y={values.yField} size={8} fill="#2563eb" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
