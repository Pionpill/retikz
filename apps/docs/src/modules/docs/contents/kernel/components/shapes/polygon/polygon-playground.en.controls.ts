import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { PolygonPlaygroundControlId } from './polygon-playground.controls';

/** RegularPolygon 几何与外观的英文属性面板 */
export const polygonPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'RegularPolygon Geometry',
  sections: [
    {
      label: 'Vertices',
      controls: [
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Sides,
          label: 'Sides',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Radius,
          label: 'Circumradius',
          defaultValue: 64,
          min: 30,
          max: 90,
          step: 2,
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Rotate,
          label: 'Start angle',
          defaultValue: -90,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'color',
          id: PolygonPlaygroundControlId.Fill,
          label: 'Fill',
          defaultValue: '#dbeafe',
        },
        {
          kind: 'color',
          id: PolygonPlaygroundControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#2563eb',
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.StrokeWidth,
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

/** RegularPolygon playground 的英文稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: polygonPlaygroundControls,
  canonicalValues: {
    sides: 6,
    radius: 64,
    rotate: -90,
    fill: '#dbeafe',
    stroke: '#2563eb',
    strokeWidth: 2,
  },
  presets: [
    { id: 'triangle', label: 'Triangle', values: { sides: 3, rotate: -90 } },
    { id: 'octagon', label: 'Octagon', values: { sides: 8, rotate: -67.5 } },
  ],
  relatedApis: [
    'RegularPolygon.sides',
    'RegularPolygon.radius',
    'RegularPolygon.rotate',
    'Path.fill',
    'Path.stroke',
    'Path.strokeWidth',
  ],
} satisfies PreviewControlContract;
