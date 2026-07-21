import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Rectangle playground 使用的稳定字段 id */
export const RectanglePlaygroundControlId = {
  Width: 'width',
  Height: 'height',
  CornerRadius: 'cornerRadius',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
} as const;

/** Rectangle 几何与外观的中文属性面板 */
export const rectanglePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Rectangle 几何',
  sections: [
    {
      label: '尺寸',
      controls: [
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.Width,
          label: '宽度',
          defaultValue: 150,
          min: 60,
          max: 220,
          step: 5,
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.Height,
          label: '高度',
          defaultValue: 90,
          min: 40,
          max: 140,
          step: 5,
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 12,
          min: 0,
          max: 45,
          step: 1,
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'color',
          id: RectanglePlaygroundControlId.Fill,
          label: '填充色',
          defaultValue: '#ffedd5',
        },
        {
          kind: 'color',
          id: RectanglePlaygroundControlId.Stroke,
          label: '描边色',
          defaultValue: '#c2410c',
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.StrokeWidth,
          label: '描边宽度',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
  ],
});

/** Rectangle playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: rectanglePlaygroundControls,
  canonicalValues: {
    width: 150,
    height: 90,
    cornerRadius: 12,
    fill: '#ffedd5',
    stroke: '#c2410c',
    strokeWidth: 2,
  },
  presets: [
    { id: 'square', label: '正方形', values: { width: 100, height: 100, cornerRadius: 0 } },
    { id: 'capsule', label: '胶囊轮廓', values: { width: 190, height: 64, cornerRadius: 32 } },
  ],
  relatedApis: [
    'Rectangle.width',
    'Rectangle.height',
    'Rectangle.cornerRadius',
    'Path.fill',
    'Path.stroke',
    'Path.strokeWidth',
  ],
} satisfies PreviewControlContract;
