import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Star playground 使用的稳定字段 id */
export const StarPlaygroundControlId = {
  Points: 'points',
  OuterRadius: 'outerRadius',
  InnerRatio: 'innerRatio',
  Rotate: 'rotate',
  Fill: 'fill',
  Stroke: 'stroke',
  StrokeWidth: 'strokeWidth',
} as const;

/** Star 几何与外观的中文属性面板 */
export const starPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Star 几何',
  sections: [
    {
      label: '顶点',
      controls: [
        {
          kind: 'range',
          id: StarPlaygroundControlId.Points,
          label: '外角数量',
          defaultValue: 5,
          min: 2,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.OuterRadius,
          label: '外半径',
          defaultValue: 64,
          min: 30,
          max: 90,
          step: 2,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.InnerRatio,
          label: '内外半径比',
          defaultValue: 0.5,
          min: 0.15,
          max: 0.85,
          step: 0.05,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.Rotate,
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
          id: StarPlaygroundControlId.Fill,
          label: '填充色',
          defaultValue: '#fef3c7',
        },
        {
          kind: 'color',
          id: StarPlaygroundControlId.Stroke,
          label: '描边色',
          defaultValue: '#d97706',
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.StrokeWidth,
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

/** Star playground 的稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: starPlaygroundControls,
  canonicalValues: {
    points: 5,
    outerRadius: 64,
    innerRatio: 0.5,
    rotate: -90,
    fill: '#fef3c7',
    stroke: '#d97706',
    strokeWidth: 2,
  },
  presets: [
    { id: 'badge', label: '徽章', values: { points: 8, innerRatio: 0.72, rotate: -90 } },
    { id: 'sharp', label: '锐角星', values: { points: 5, innerRatio: 0.25, rotate: -90 } },
  ],
  relatedApis: [
    'Star.points',
    'Star.outerRadius',
    'Star.innerRatio',
    'Star.rotate',
    'Path.fill',
    'Path.stroke',
    'Path.strokeWidth',
  ],
} satisfies PreviewControlContract;
