import { PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { otherRows } from './builtin-other.data';

/** 图形参数 */
export type BuiltinOtherPreviewValues = {
  pointZIndex: number;
  orderEnabled: boolean;
  seriesEnabled: boolean;
};

/** 绘制示例图形 */
export const BuiltinOtherPreview = (
  values: BuiltinOtherPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const rows = otherRows.map(row => ({
    ...row,
    fill: row.series === 'B' ? '#f97316' : '#2563eb',
    zIndex: row.series === 'B' ? values.pointZIndex : 0,
  }));

  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
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
      <PlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.2, upper: 0.2 }} />
      <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.2, upper: 0.2 }} />
      <PointMark
        encodings={{ fill: 'fill', zIndex: 'zIndex', position: { x: { field: 'step' }, y: { field: 'value' } } }}
        properties={{ size: 18 }}
      />
      <PathMark
        encodings={{
          ...(values.orderEnabled ? { order: 'step' } : {}),
          ...(values.seriesEnabled ? { series: 'series' } : {}),
          ...(values.seriesEnabled ? { color: 'series' } : {}),
          position: { x: { field: 'step' }, y: { field: 'value' } },
        }}
        properties={{ strokeWidth: 3 }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
