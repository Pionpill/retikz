import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** RegularPolygon playground 使用的稳定字段 id */
export const PolygonPlaygroundControlId = {
  Sides: 'sides',
  Radius: 'radius',
  Rotate: 'rotate',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
} as const;

/** RegularPolygon 几何与外观的中文属性面板 */
export const polygonPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'RegularPolygon 几何',
  sections: [
    {
      label: '顶点',
      controls: [
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Sides,
          label: '边数',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Radius,
          label: '外接圆半径',
          defaultValue: 64,
          min: 30,
          max: 90,
          step: 2,
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.Rotate,
          label: '起始角',
          defaultValue: -90,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
    {
      label: '外观',
      controls: [
        {
          kind: 'color',
          id: PolygonPlaygroundControlId.Fill,
          label: '填充色',
          defaultValue: '#dbeafe',
        },
        {
          kind: 'color',
          id: PolygonPlaygroundControlId.Stroke,
          label: '描边色',
          defaultValue: '#2563eb',
        },
        {
          kind: 'range',
          id: PolygonPlaygroundControlId.StrokeWidth,
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

/** RegularPolygon playground 的稳定状态与 API 覆盖 */
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
    { id: 'triangle', label: '三角形', values: { sides: 3, rotate: -90 } },
    { id: 'octagon', label: '八边形', values: { sides: 8, rotate: -67.5 } },
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
