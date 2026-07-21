import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { StarPlaygroundControlId } from './star-playground.controls';

/** Star 几何与外观的英文属性面板 */
export const starPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Star Geometry',
  sections: [
    {
      label: 'Vertices',
      controls: [
        {
          kind: 'range',
          id: StarPlaygroundControlId.Points,
          label: 'Outer points',
          defaultValue: 5,
          min: 2,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.OuterRadius,
          label: 'Outer radius',
          defaultValue: 64,
          min: 30,
          max: 90,
          step: 2,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.InnerRatio,
          label: 'Inner / outer ratio',
          defaultValue: 0.5,
          min: 0.15,
          max: 0.85,
          step: 0.05,
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.Rotate,
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
          id: StarPlaygroundControlId.Fill,
          label: 'Fill',
          defaultValue: '#fef3c7',
        },
        {
          kind: 'color',
          id: StarPlaygroundControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#d97706',
        },
        {
          kind: 'range',
          id: StarPlaygroundControlId.StrokeWidth,
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

/** Star playground 的英文稳定状态与 API 覆盖 */
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
    { id: 'badge', label: 'Badge', values: { points: 8, innerRatio: 0.72, rotate: -90 } },
    { id: 'sharp', label: 'Sharp star', values: { points: 5, innerRatio: 0.25, rotate: -90 } },
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
