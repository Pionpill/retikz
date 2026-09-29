import { PathMark, Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { otherRows } from './builtin-other.data';

/** 图形参数 */
export type BuiltinOtherPreviewValues = {
  pointZIndex: number;
  orderEnabled: boolean;
  seriesEnabled: boolean;
};

/** 绘制示例图形 */
export const BuiltinOtherPreview = (values: BuiltinOtherPreviewValues) => {
  const rows = otherRows.map(row => ({
    ...row,
    fill: row.series === 'B' ? '#f97316' : '#2563eb',
    zIndex: row.series === 'B' ? values.pointZIndex : 0,
  }));

  return (
    <Plot
      data={rows}
      model={[
        { name: 'step', type: 'continuous' },
        { name: 'value', type: 'continuous' },
        { name: 'series', type: 'categorical' },
        { name: 'fill', type: 'categorical' },
        { name: 'zIndex', type: 'continuous' },
      ]}
      width={380}
      height={240}
    >
      <PointMark x="step" y="value" fill="fill" size={18} zIndex="zIndex" />
      <PathMark
        x="step"
        y="value"
        order={values.orderEnabled ? 'step' : undefined}
        series={values.seriesEnabled ? 'series' : undefined}
        color={values.seriesEnabled ? 'series' : undefined}
        strokeWidth={3}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
