import { PlotAxis, PointMark } from '@retikz/plot-react';
import type { PointMarkProps } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';

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
  /** 文字对齐 */
  align: 'start' | 'middle' | 'end';
  /** 行高 */
  lineHeight: number;
  /** 文字宽度上限 */
  maxTextWidth: number;
  /** 内容字段 */
  textField: 'label' | 'pop' | 'description';
  /** 数值格式 */
  displayFormat: '' | '.1f' | ',';
  /** 回调标签 */
  resolveLabel: boolean;
  coordinate: 'cartesian2D' | 'polar2D';
};

/** 绘制示例图形 */
export const PointTextPreview = (values: PointTextPreviewValues) => {
  const textColor = values.textColor;
  const font = {
    size: values.fontSize,
    weight: values.fontBold ? ('bold' as const) : ('normal' as const),
  };
  const displayFormat = values.textField === 'pop' && values.displayFormat ? values.displayFormat : undefined;
  const textProps: PointMarkProps =
    values.mode === 'label'
      ? {
          encodings: {
            color: 'region',
            label: { text: values.textField, font: { size: 'labelSize', weight: 'labelWeight' } },
            position: { x: { field: 'x' }, y: { field: 'y' } },
          },
          properties: {
            label: {
              displayFormat,
              position: values.labelPosition,
              distance: values.labelDistance,
              pin: values.labelPin,
              textColor,
              font,
            },
          },
        }
      : {
          encodings: { text: values.textField, position: { x: { field: 'x' }, y: { field: 'y' } } },
          properties: {
            displayFormat,
            align: values.align,
            lineHeight: values.lineHeight,
            maxTextWidth: values.maxTextWidth,
            textColor,
            font,
            dx: values.dx,
            dy: values.dy,
          },
        };

  const labelRows = points.map((row, index) => ({
    ...row,
    labelSize: values.fontSize * (0.8 + (index % 3) * 0.2),
    labelWeight: values.fontBold ? 700 : 400,
  }));

  return (
    <Layout viewBox={{ x: -100, y: -70, width: 600, height: 408 }}>
      <Plot
        data={labelRows}
        width={400}
        height={280}
        coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}
      >
        <PointMark
          id="text-demo"
          {...textProps}
          resolveLabel={values.resolveLabel && values.mode === 'label' ? row => `${row.label}: ${row.pop}` : undefined}
        />
        <PlotAxis dimension="x" />
        <PlotAxis dimension="y" grid />
      </Plot>
    </Layout>
  );
};
