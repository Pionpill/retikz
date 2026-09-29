import { DataFieldType } from '@retikz/data';
import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { positionRows } from './builtin-position.data';

/** 图形参数 */
export type BuiltinPositionPreviewValues = {
  xField: 'month' | 'sales' | 'profit' | 'orders' | 'averageOrder';
  yField: 'month' | 'sales' | 'profit' | 'orders' | 'averageOrder';
};

/** 绘制示例图形 */
export const BuiltinPositionPreview = (values: BuiltinPositionPreviewValues) => (
  <Plot
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
    <PointMark x={values.xField} y={values.yField} size={8} fill="#2563eb" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
