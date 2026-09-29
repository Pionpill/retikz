import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { pointStyleRows } from './builtin-point-style.data';

/** 图形参数 */
export type BuiltinPointStylePreviewValues = {
  paintChannel: 'color' | 'stroke' | 'fill';
  paint: string;
  strokeWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
  size: number;
  shape: 'rectangle' | 'circle' | 'diamond';
};

/** 绘制示例图形 */
export const BuiltinPointStylePreview = (values: BuiltinPointStylePreviewValues) => {
  const usesColor = values.paintChannel === 'color';
  const usesFill = values.paintChannel === 'fill';
  const usesStroke = values.paintChannel === 'stroke';

  return (
    <Plot
      data={pointStyleRows}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]}
      width={440}
      height={280}
    >
      <PointMark
        x="x"
        y="y"
        color={usesColor ? { kind: 'constant', value: values.paint } : undefined}
        fill={
          usesFill
            ? { kind: 'constant', value: values.paint }
            : usesStroke
              ? { kind: 'constant', value: '#dbeafe' }
              : undefined
        }
        stroke={
          usesStroke
            ? { kind: 'constant', value: values.paint }
            : usesFill
              ? { kind: 'constant', value: '#1e3a8a' }
              : undefined
        }
        strokeWidth={values.strokeWidth}
        opacity={values.opacity}
        fillOpacity={values.fillOpacity}
        strokeOpacity={values.strokeOpacity}
        size={values.size}
        shape={{ kind: 'constant', value: values.shape }}
      />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
