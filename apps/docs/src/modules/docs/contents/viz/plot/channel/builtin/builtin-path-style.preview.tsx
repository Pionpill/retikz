import { DataFieldType } from '@retikz/data';
import { PathMark, Plot, PlotAxis } from '@retikz/plot-react';

import { pathStyleRows } from './builtin-path-style.data';

/** 图形参数 */
export type BuiltinPathStylePreviewValues = {
  dashMode: 'solid' | 'dashed' | 'dotted';
  stroke: string;
  strokeWidth: number;
  opacity: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'round' | 'miter' | 'bevel';
  roundedCorners: number;
};

/** 绘制示例图形 */
export const BuiltinPathStylePreview = (values: BuiltinPathStylePreviewValues) => {
  const dashPattern = values.dashMode === 'dashed' ? [7, 4] : values.dashMode === 'dotted' ? [1, 4] : undefined;

  return (
    <Plot
      data={pathStyleRows}
      model={[
        { name: 'step', type: DataFieldType.Continuous },
        { name: 'value', type: DataFieldType.Continuous },
      ]}
      width={440}
      height={280}
    >
      <PathMark
        x="step"
        y="value"
        order="step"
        stroke={{ kind: 'constant', value: values.stroke }}
        strokeWidth={values.strokeWidth}
        opacity={values.opacity}
        dashPattern={dashPattern}
        lineCap={values.lineCap}
        lineJoin={values.lineJoin}
        roundedCorners={values.roundedCorners}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
