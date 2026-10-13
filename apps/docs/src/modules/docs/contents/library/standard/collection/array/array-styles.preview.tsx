import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';

/** 图形参数 */
export type ArrayStylesPreviewValues = {
  indexEnabled: boolean;
  indexPosition: 'before' | 'after';
  indexStart: number;
  indexFontSize: number;
  indexFontWeight: 'normal' | 'bold';
  indexTextColor: string;
  direction: 'row' | 'column';
  widthMode: 'auto' | 'content' | 'fixed';
  width: number;
  autoHeight: boolean;
  height: number;
  padding: number;
  gap: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  fontSize: number;
  override: boolean;
};

/** 绘制示例图形 */
export const renderArrayStylesPreview = (values: ArrayStylesPreviewValues) => (
  <Layout viewBox={{ x: -78, y: -115, width: 360, height: 290 }}>
    <Array
      index={
        values.indexEnabled
          ? {
              position: values.indexPosition,
              start: values.indexStart,
              style: {
                font: { size: values.indexFontSize, weight: values.indexFontWeight },
                textColor: values.indexTextColor,
              },
            }
          : false
      }
      items={['A', 'B1', 'C'].map(content => ({
        content,
        ...(content === 'B1' && values.override ? { style: { fill: '#2563eb', opacity: { fill: 0.4 } } } : {}),
      }))}
      layout={{ direction: values.direction, gap: values.gap }}
      defaultCell={{
        style: {
          fill: values.fill,
          stroke: values.stroke,
          strokeWidth: values.strokeWidth,
          cornerRadius: values.cornerRadius,
          font: { size: values.fontSize },
          opacity: { fill: 0.25 },
        },
        layout: {
          width: values.widthMode === 'fixed' ? values.width : values.widthMode,
          height: values.autoHeight ? 'auto' : values.height,
          padding: values.padding,
        },
      }}
    />
  </Layout>
);
