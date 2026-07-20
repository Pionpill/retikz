import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ArcSectorPlaygroundControlId, ArcSectorPlaygroundVisibleWhen } from './arc-sector-playground.controls';

/** Arc 与 Sector 共享几何的英文属性面板 */
export const arcSectorPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Arc / Sector Geometry',
  sections: [
    {
      label: 'Radii and angles',
      controls: [
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.RadiusX,
          label: 'x radius',
          defaultValue: 72,
          min: 35,
          max: 95,
          step: 2,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.RadiusY,
          label: 'y radius',
          defaultValue: 52,
          min: 25,
          max: 85,
          step: 2,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.StartAngle,
          label: 'Start angle',
          defaultValue: -40,
          min: -180,
          max: 360,
          step: 5,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.EndAngle,
          label: 'End angle',
          defaultValue: 220,
          min: -180,
          max: 360,
          step: 5,
        },
      ],
    },
    {
      label: 'Closure and inner arc',
      controls: [
        {
          kind: 'select',
          id: ArcSectorPlaygroundControlId.ArcClose,
          label: 'Arc closure',
          defaultValue: 'open',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'chord', label: 'Chord' },
            { value: 'sector', label: 'To center' },
          ],
        },
        {
          kind: 'switch',
          id: ArcSectorPlaygroundControlId.Hollow,
          label: 'Hollow Sector',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.InnerRatio,
          label: 'Inner / outer ratio',
          defaultValue: 0.55,
          min: 0.1,
          max: 0.85,
          step: 0.05,
          visibleWhen: ArcSectorPlaygroundVisibleWhen.Hollow,
        },
        {
          kind: 'color',
          id: ArcSectorPlaygroundControlId.Fill,
          label: 'Fill',
          defaultValue: '#fdba74',
        },
        {
          kind: 'color',
          id: ArcSectorPlaygroundControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#c2410c',
        },
      ],
    },
  ],
});

/** Arc / Sector playground 的英文稳定状态与 API 覆盖 */
export const previewControlContract = {
  controls: arcSectorPlaygroundControls,
  canonicalValues: {
    radiusX: 72,
    radiusY: 52,
    startAngle: -40,
    endAngle: 220,
    arcClose: 'open',
    hollow: true,
    innerRatio: 0.55,
    fill: '#fdba74',
    stroke: '#c2410c',
  },
  presets: [
    {
      id: 'circular-wedge',
      label: 'Solid circular wedge',
      values: { radiusX: 64, radiusY: 64, hollow: false, startAngle: -60, endAngle: 60 },
    },
    {
      id: 'ring-sector',
      label: 'Thin ring sector',
      values: { hollow: true, innerRatio: 0.75, startAngle: 20, endAngle: 160 },
    },
  ],
  relatedApis: [
    'Arc.radius',
    'Arc.startAngle',
    'Arc.endAngle',
    'Arc.close',
    'Sector.radius',
    'Sector.innerRadius',
    'Sector.startAngle',
    'Sector.endAngle',
    'Path.fill',
    'Path.stroke',
  ],
} satisfies PreviewControlContract;
