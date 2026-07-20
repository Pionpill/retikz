import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { EllipsePlaygroundControlId, EllipsePlaygroundVisibleWhen } from './ellipse-playground.controls';

/** Ellipse 构造与弧段的英文属性面板 */
export const ellipsePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ellipse Geometry',
  sections: [
    {
      label: 'Construction',
      controls: [
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Construction,
          label: 'Input',
          defaultValue: 'radius',
          options: [
            { value: 'radius', label: 'Center + radii' },
            { value: 'diameter', label: 'Center + diameters' },
            { value: 'corners', label: 'Opposite corners' },
            { value: 'box', label: 'Bounding box' },
          ],
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.RadiusX,
          label: 'x radius',
          defaultValue: 72,
          min: 20,
          max: 100,
          step: 2,
          visibleWhen: EllipsePlaygroundVisibleWhen.Radius,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.RadiusY,
          label: 'y radius',
          defaultValue: 42,
          min: 20,
          max: 90,
          step: 2,
          visibleWhen: EllipsePlaygroundVisibleWhen.Radius,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.BoxWidth,
          label: 'Box width',
          defaultValue: 144,
          min: 60,
          max: 180,
          step: 4,
          visibleWhen: EllipsePlaygroundVisibleWhen.Box,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.BoxHeight,
          label: 'Box height',
          defaultValue: 84,
          min: 40,
          max: 140,
          step: 4,
          visibleWhen: EllipsePlaygroundVisibleWhen.Box,
        },
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Adjustment,
          label: 'Box adjustment',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'None' },
            { value: 'inset', label: 'Inset' },
            { value: 'outset', label: 'Outset' },
          ],
          visibleWhen: EllipsePlaygroundVisibleWhen.Adjustment,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.AdjustmentAmount,
          label: 'Adjustment',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 1,
          visibleWhen: EllipsePlaygroundVisibleWhen.AdjustmentAmount,
        },
      ],
    },
    {
      label: 'Segment',
      controls: [
        {
          kind: 'switch',
          id: EllipsePlaygroundControlId.Segment,
          label: 'Draw a partial arc',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.StartAngle,
          label: 'Start angle',
          defaultValue: -30,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'range',
          id: EllipsePlaygroundControlId.EndAngle,
          label: 'End angle',
          defaultValue: 220,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'select',
          id: EllipsePlaygroundControlId.Closed,
          label: 'Closure',
          defaultValue: 'open',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'chord', label: 'Chord' },
            { value: 'sector', label: 'To center' },
          ],
          visibleWhen: EllipsePlaygroundVisibleWhen.Segment,
        },
        {
          kind: 'color',
          id: EllipsePlaygroundControlId.Fill,
          label: 'Fill',
          defaultValue: '#fed7aa',
        },
        {
          kind: 'color',
          id: EllipsePlaygroundControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#ff8c00',
        },
      ],
    },
  ],
});

/** Ellipse playground 的英文稳定状态、语义 preset 与 API 覆盖 */
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
      label: 'Inset bounding box',
      values: { construction: 'box', adjustment: 'inset', adjustmentAmount: 12 },
    },
    {
      id: 'sector-segment',
      label: 'Elliptical sector',
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
