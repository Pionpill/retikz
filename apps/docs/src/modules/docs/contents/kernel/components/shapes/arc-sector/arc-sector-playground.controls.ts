import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Arc / Sector playground 使用的稳定字段 id */
export const ArcSectorPlaygroundControlId = {
  RadiusX: 'radiusX',
  RadiusY: 'radiusY',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
  ArcClose: 'arcClose',
  Hollow: 'hollow',
  InnerRatio: 'innerRatio',
  Fill: 'fill',
  Stroke: 'stroke',
} as const;

/** Arc / Sector 字段按空心模式显示的共享条件 */
export const ArcSectorPlaygroundVisibleWhen = {
  Hollow: { controlId: ArcSectorPlaygroundControlId.Hollow, oneOf: [true] },
} as const;

/** Arc 与 Sector 共享几何的中文属性面板 */
export const arcSectorPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Arc / Sector 几何',
  sections: [
    {
      label: '半径与角度',
      controls: [
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.RadiusX,
          label: 'x 半径',
          defaultValue: 72,
          min: 35,
          max: 95,
          step: 2,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.RadiusY,
          label: 'y 半径',
          defaultValue: 52,
          min: 25,
          max: 85,
          step: 2,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.StartAngle,
          label: '起始角',
          defaultValue: -40,
          min: -180,
          max: 360,
          step: 5,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.EndAngle,
          label: '结束角',
          defaultValue: 220,
          min: -180,
          max: 360,
          step: 5,
        },
      ],
    },
    {
      label: '闭合与内弧',
      controls: [
        {
          kind: 'select',
          id: ArcSectorPlaygroundControlId.ArcClose,
          label: 'Arc 闭合',
          defaultValue: 'open',
          options: [
            { value: 'open', label: '开放' },
            { value: 'chord', label: '弦闭合' },
            { value: 'sector', label: '连回圆心' },
          ],
        },
        {
          kind: 'switch',
          id: ArcSectorPlaygroundControlId.Hollow,
          label: 'Sector 空心',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: ArcSectorPlaygroundControlId.InnerRatio,
          label: '内外半径比',
          defaultValue: 0.55,
          min: 0.1,
          max: 0.85,
          step: 0.05,
          visibleWhen: ArcSectorPlaygroundVisibleWhen.Hollow,
        },
        {
          kind: 'color',
          id: ArcSectorPlaygroundControlId.Fill,
          label: '填充色',
          defaultValue: '#fdba74',
        },
        {
          kind: 'color',
          id: ArcSectorPlaygroundControlId.Stroke,
          label: '描边色',
          defaultValue: '#c2410c',
        },
      ],
    },
  ],
});

/** Arc / Sector playground 的稳定状态与 API 覆盖 */
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
      label: '圆形实心扇区',
      values: { radiusX: 64, radiusY: 64, hollow: false, startAngle: -60, endAngle: 60 },
    },
    {
      id: 'ring-sector',
      label: '窄环楔',
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
