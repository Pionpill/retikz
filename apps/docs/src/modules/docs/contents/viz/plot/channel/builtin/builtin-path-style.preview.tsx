import { DataFieldType } from '@retikz/data';
import { PathMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';

import { pathStyleRows } from './builtin-path-style.data';

/** 图形参数 */
export type BuiltinPathStylePreviewValues = {
  dashMode: 'solid' | 'dashed' | 'dotted';
  stroke: string;
  strokeWidth: number;
  opacity: number;
  lineCap: 'butt' | 'round' | 'square';
  lineJoin: 'round' | 'miter' | 'bevel';
  cornerRadius: number;
};

/** 绘制示例图形 */
export const BuiltinPathStylePreview = (
  values: BuiltinPathStylePreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const dashPattern = values.dashMode === 'dashed' ? [7, 4] : values.dashMode === 'dotted' ? [1, 4] : undefined;

  return (
    <Plot
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
      data={pathStyleRows}
      model={[
        { name: 'step', type: DataFieldType.Continuous },
        { name: 'value', type: DataFieldType.Continuous },
      ]}
      width={440}
      height={280}
    >
      <PlotScale dimension="x" type="linear" domainPadding={{ kind: 'ratio', lower: 0.2, upper: 0.2 }} />
      <PlotScale dimension="y" type="linear" domainPadding={{ kind: 'ratio', lower: 0.2, upper: 0.2 }} />
      <PathMark
        encodings={{ order: 'step', position: { x: { field: 'step' }, y: { field: 'value' } } }}
        properties={{
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          opacity: { overall: values.opacity },
          dashPattern,
          lineCap: values.lineCap,
          lineJoin: values.lineJoin,
          cornerRadius: values.cornerRadius,
        }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
