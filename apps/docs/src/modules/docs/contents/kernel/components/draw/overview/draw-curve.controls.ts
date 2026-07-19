import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw 曲线 playground 的稳定字段 id */
export const DrawCurveControlId = {
  Kind: 'curveKind',
  Control: 'control',
  Control1: 'control1',
  Control2: 'control2',
  BendDirection: 'bendDirection',
  BendAngle: 'bendAngle',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
  Radius: 'radius',
  RadiusX: 'radiusX',
  RadiusY: 'radiusY',
} as const;

/** Draw 曲线字段按 kind 显示的共享条件 */
export const DrawCurveVisibleWhen = {
  Curve: { controlId: DrawCurveControlId.Kind, oneOf: ['curve'] },
  Cubic: { controlId: DrawCurveControlId.Kind, oneOf: ['cubic'] },
  Bend: { controlId: DrawCurveControlId.Kind, oneOf: ['bend'] },
  Arc: { controlId: DrawCurveControlId.Kind, oneOf: ['arc'] },
  Circle: { controlId: DrawCurveControlId.Kind, oneOf: ['circle'] },
  Ellipse: { controlId: DrawCurveControlId.Kind, oneOf: ['ellipse'] },
} as const;

/** Draw 六种曲线与整圆操作的中文属性面板 */
export const drawCurveControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw 曲线',
  sections: [
    {
      label: '曲线类型',
      controls: [
        {
          kind: 'select',
          id: DrawCurveControlId.Kind,
          label: 'way 操作',
          defaultValue: 'curve',
          options: [
            { value: 'curve', label: '二次贝塞尔' },
            { value: 'cubic', label: '三次贝塞尔' },
            { value: 'bend', label: '弯曲简写' },
            { value: 'arc', label: '弧段' },
            { value: 'circle', label: '整圆' },
            { value: 'ellipse', label: '整椭圆' },
          ],
        },
      ],
    },
    {
      label: '贝塞尔参数',
      controls: [
        {
          kind: 'point',
          id: DrawCurveControlId.Control,
          label: '控制点',
          defaultValue: [100, -70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Curve,
        },
        {
          kind: 'point',
          id: DrawCurveControlId.Control1,
          label: '控制点 1',
          defaultValue: [60, -70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Cubic,
        },
        {
          kind: 'point',
          id: DrawCurveControlId.Control2,
          label: '控制点 2',
          defaultValue: [140, 70],
          min: [0, -100],
          max: [200, 100],
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Cubic,
        },
      ],
    },
    {
      label: '弯曲与弧段',
      controls: [
        {
          kind: 'select',
          id: DrawCurveControlId.BendDirection,
          label: '弯曲方向',
          defaultValue: 'left',
          visibleWhen: DrawCurveVisibleWhen.Bend,
          options: [
            { value: 'left', label: '向左' },
            { value: 'right', label: '向右' },
          ],
        },
        {
          kind: 'range',
          id: DrawCurveControlId.BendAngle,
          label: '弯曲角度',
          defaultValue: 30,
          min: 5,
          max: 80,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Bend,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.StartAngle,
          label: '起始角',
          defaultValue: 0,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.EndAngle,
          label: '结束角',
          defaultValue: 120,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Arc,
        },
      ],
    },
    {
      label: '半径',
      controls: [
        {
          kind: 'range',
          id: DrawCurveControlId.Radius,
          label: '半径',
          defaultValue: 60,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: {
            controlId: DrawCurveControlId.Kind,
            oneOf: ['arc', 'circle'],
          },
        },
        {
          kind: 'range',
          id: DrawCurveControlId.RadiusX,
          label: 'x 半径',
          defaultValue: 80,
          min: 20,
          max: 100,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Ellipse,
        },
        {
          kind: 'range',
          id: DrawCurveControlId.RadiusY,
          label: 'y 半径',
          defaultValue: 45,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: DrawCurveVisibleWhen.Ellipse,
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: drawCurveControls,
  canonicalValues: {
    curveKind: 'curve',
    control: [100, -70],
    control1: [60, -70],
    control2: [140, 70],
    bendDirection: 'left',
    bendAngle: 30,
    startAngle: 0,
    endAngle: 120,
    radius: 60,
    radiusX: 80,
    radiusY: 45,
  },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
