import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { RectanglePlaygroundControlId } from './rectangle-playground.controls';

/** Rectangle 几何与外观的英文属性面板 */
export const rectanglePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Rectangle Geometry',
  sections: [
    {
      label: 'Size',
      controls: [
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.Width,
          label: 'Width',
          defaultValue: 150,
          min: 60,
          max: 220,
          step: 5,
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.Height,
          label: 'Height',
          defaultValue: 90,
          min: 40,
          max: 140,
          step: 5,
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 12,
          min: 0,
          max: 45,
          step: 1,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'color',
          id: RectanglePlaygroundControlId.Fill,
          label: 'Fill',
          defaultValue: '#ffedd5',
        },
        {
          kind: 'color',
          id: RectanglePlaygroundControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#c2410c',
        },
        {
          kind: 'range',
          id: RectanglePlaygroundControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
      ],
    },
  ],
});

/** Rectangle playground 的英文稳定状态与 API 覆盖 */
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
    { id: 'square', label: 'Square', values: { width: 100, height: 100, cornerRadius: 0 } },
    { id: 'capsule', label: 'Capsule outline', values: { width: 190, height: 64, cornerRadius: 32 } },
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
