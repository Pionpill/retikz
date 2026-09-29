import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { points } from './point-api.data';

/** 图形参数 */
export type PointTextPreviewValues = {
  textColor: string;
  fontSize: number;
  fontBold: boolean;
  mode: 'text' | 'label';
  labelPosition:
    | 'top'
    | 'center'
    | 'top-right'
    | 'right'
    | 'bottom-right'
    | 'bottom'
    | 'bottom-left'
    | 'left'
    | 'top-left';
  labelDistance: number;
  labelPin: boolean;
  dx: number;
  dy: number;
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const PointTextPreview = (values: PointTextPreviewValues) => {
  const textColor = values.textColor;
  const font = {
    size: values.fontSize,
    weight: values.fontBold ? ('bold' as const) : ('normal' as const),
  };
  const textProps =
    values.mode === 'label'
      ? {
          color: 'region',
          label: 'label',
          labelPosition: values.labelPosition,
          labelDistance: values.labelDistance,
          labelPin: values.labelPin,
          labelTextColor: textColor,
          labelFont: font,
        }
      : {
          text: 'label',
          textColor,
          font,
          dx: values.dx,
          dy: values.dy,
        };

  return (
    <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
      <PointMark x="x" y="y" {...textProps} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
