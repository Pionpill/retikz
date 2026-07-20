import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Ellipse playground 使用的稳定字段 id */
export const EllipsePlaygroundControlId = {
  Construction: 'construction',
  RadiusX: 'radiusX',
  RadiusY: 'radiusY',
  BoxWidth: 'boxWidth',
  BoxHeight: 'boxHeight',
  Adjustment: 'adjustment',
  AdjustmentAmount: 'adjustmentAmount',
  Segment: 'segment',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
  Closed: 'closed',
  Fill: 'fill',
  Stroke: 'stroke',
} as const;

/** Ellipse 字段按构造与弧段模式显示的共享条件 */
export const EllipsePlaygroundVisibleWhen = {
  Radius: { controlId: EllipsePlaygroundControlId.Construction, oneOf: ['radius', 'diameter'] },
  Box: { controlId: EllipsePlaygroundControlId.Construction, oneOf: ['corners', 'box'] },
  Adjustment: { controlId: EllipsePlaygroundControlId.Construction, oneOf: ['corners', 'box'] },
  AdjustmentAmount: { controlId: EllipsePlaygroundControlId.Adjustment, oneOf: ['inset', 'outset'] },
  Segment: { controlId: EllipsePlaygroundControlId.Segment, oneOf: [true] },
} as const;

/** Ellipse 构造与弧段的中文属性面板 */
export const ellipsePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ellipse 几何',
  sections: [
    {
      label: '构造方式',
      controls: [
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Construction,
          label: '输入',
          defaultValue: 'radius',
          options: [
            { value: 'radius', label: '中心 + 半径' },
            { value: 'diameter', label: '中心 + 直径' },
            { value: 'corners', label: '两对角' },
            { value: 'box', label: '外接框' },
          ],
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.RadiusX,
          label: 'x 半径',
          defaultValue: 72,
          min: 20,
          max: 100,
          step: 2,
          visibleWhen: EllipsePlaygroundVisibleWhen.Radius,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.RadiusY,
          label: 'y 半径',
          defaultValue: 42,
          min: 20,
          max: 90,
          step: 2,
          visibleWhen: EllipsePlaygroundVisibleWhen.Radius,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.BoxWidth,
          label: '框宽',
          defaultValue: 144,
          min: 60,
          max: 180,
          step: 4,
          visibleWhen: EllipsePlaygroundVisibleWhen.Box,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.BoxHeight,
          label: '框高',
          defaultValue: 84,
          min: 40,
          max: 140,
          step: 4,
          visibleWhen: EllipsePlaygroundVisibleWhen.Box,
        },
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Adjustment,
          label: '外接框调整',
          defaultValue: 'none',
          options: [
            { value: 'none', label: '不调整' },
            { value: 'inset', label: '向内收缩' },
            { value: 'outset', label: '向外扩张' },
          ],
          visibleWhen: EllipsePlaygroundVisibleWhen.Adjustment,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.AdjustmentAmount,
          label: '调整量',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 1,
          visibleWhen: EllipsePlaygroundVisibleWhen.AdjustmentAmount,
        },
      ],
    },
    {
      label: '弧段',
      controls: [
        {
          kind: 'switch',
          id: EllipsePlaygroundControlId.Segment,
          label: '只画局部弧段',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.StartAngle,
          label: '起始角',
          defaultValue: -30,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.EndAngle,
          label: '结束角',
          defaultValue: 220,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Closed,
          label: '闭合方式',
          defaultValue: 'open',
          options: [
            { value: 'open', label: '开放' },
            { value: 'chord', label: '弦闭合' },
            { value: 'sector', label: '连回圆心' },
          ],
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'color',
          id: EllipsePlaygroundControlId.Fill,
          label: '填充色',
          defaultValue: '#fed7aa',
        },
        {
          kind: 'color',
          id: EllipsePlaygroundControlId.Stroke,
          label: '描边色',
          defaultValue: '#ff8c00',
        },
      ],
    },
  ],
});

/** Ellipse playground 的稳定截图状态、语义 preset 与 API 覆盖 */
export const previewControlContract = {
  controls: ellipsePlaygroundControls,
  canonicalValues: {
    construction: 'radius',
    radiusX: 72,
    radiusY: 42,
    boxWidth: 144,
    boxHeight: 84,
    adjustment: 'none',
    adjustmentAmount: 8,
    segment: false,
    startAngle: -30,
    endAngle: 220,
    closed: 'open',
    fill: '#fed7aa',
    stroke: '#ff8c00',
  },
  presets: [
    {
      id: 'inset-box',
      label: '内缩外接框',
      values: { construction: 'box', adjustment: 'inset', adjustmentAmount: 12 },
    },
    {
      id: 'sector-segment',
      label: '椭圆扇形',
      values: { segment: true, startAngle: -30, endAngle: 220, closed: 'sector' },
    },
  ],
  relatedApis: [
    'Ellipse.radius',
    'Ellipse.diameterX',
    'Ellipse.diameterY',
    'Ellipse.corner1',
    'Ellipse.corner2',
    'Ellipse.box',
    'Ellipse.inset',
    'Ellipse.outset',
    'Ellipse.startAngle',
    'Ellipse.endAngle',
    'Ellipse.closed',
    'Path.fill',
    'Path.stroke',
  ],
} satisfies PreviewControlContract;
