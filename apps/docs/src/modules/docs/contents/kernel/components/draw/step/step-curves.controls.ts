import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Step 曲线 playground 的稳定字段 id */
export const StepCurveControlId = {
  Kind: 'stepKind',
  Control: 'control',
  Control1: 'control1',
  Control2: 'control2',
  BendDirection: 'bendDirection',
  BendAngle: 'bendAngle',
  Tension: 'tension',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
  Radius: 'radius',
  RadiusX: 'radiusX',
  RadiusY: 'radiusY',
} as const;

/** Step 曲线字段按 kind 显示的共享条件 */
export const StepCurveVisibleWhen = {
  Curve: { controlId: StepCurveControlId.Kind, oneOf: ['curve'] },
  Cubic: { controlId: StepCurveControlId.Kind, oneOf: ['cubic'] },
  Bend: { controlId: StepCurveControlId.Kind, oneOf: ['bend'] },
  Smooth: { controlId: StepCurveControlId.Kind, oneOf: ['smooth'] },
  Arc: { controlId: StepCurveControlId.Kind, oneOf: ['arc'] },
  Circle: { controlId: StepCurveControlId.Kind, oneOf: ['circlePath'] },
  Ellipse: { controlId: StepCurveControlId.Kind, oneOf: ['ellipsePath'] },
} as const;

/** Step 曲线与圆弧动作的中文属性面板 */
export const stepCurvesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step 曲线',
  sections: [
    {
      label: '曲线类型',
      controls: [
        {
          kind: 'select',
          id: StepCurveControlId.Kind,
          label: 'kind',
          defaultValue: 'curve',
          options: [
            { value: 'curve', label: '二次贝塞尔' },
            { value: 'cubic', label: '三次贝塞尔' },
            { value: 'bend', label: '弯曲简写' },
            { value: 'smooth', label: '过点平滑曲线' },
            { value: 'arc', label: '弧段' },
            { value: 'circlePath', label: '整圆' },
            { value: 'ellipsePath', label: '整椭圆' },
          ],
        },
      ],
    },
    {
      label: '贝塞尔与平滑',
      controls: [
        {
          kind: 'point',
          id: StepCurveControlId.Control,
          label: '控制点',
          defaultValue: [0, -70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Curve,
        },
        {
          kind: 'point',
          id: StepCurveControlId.Control1,
          label: '控制点 1',
          defaultValue: [-40, -70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Cubic,
        },
        {
          kind: 'point',
          id: StepCurveControlId.Control2,
          label: '控制点 2',
          defaultValue: [40, 70],
          min: [-100, -100],
          max: [100, 100],
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Cubic,
        },
        {
          kind: 'select',
          id: StepCurveControlId.BendDirection,
          label: '弯曲方向',
          defaultValue: 'left',
          visibleWhen: StepCurveVisibleWhen.Bend,
          options: [
            { value: 'left', label: '向左' },
            { value: 'right', label: '向右' },
          ],
        },
        {
          kind: 'range',
          id: StepCurveControlId.BendAngle,
          label: '弯曲角度',
          defaultValue: 30,
          min: 5,
          max: 80,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Bend,
        },
        {
          kind: 'range',
          id: StepCurveControlId.Tension,
          label: 'tension',
          defaultValue: 1,
          min: 0.2,
          max: 2,
          step: 0.1,
          visibleWhen: StepCurveVisibleWhen.Smooth,
        },
      ],
    },
    {
      label: '角度与半径',
      controls: [
        {
          kind: 'range',
          id: StepCurveControlId.StartAngle,
          label: '起始角',
          defaultValue: 0,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: StepCurveControlId.EndAngle,
          label: '结束角',
          defaultValue: 120,
          min: -180,
          max: 360,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Arc,
        },
        {
          kind: 'range',
          id: StepCurveControlId.Radius,
          label: '半径',
          defaultValue: 60,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: { controlId: StepCurveControlId.Kind, oneOf: ['arc', 'circlePath'] },
        },
        {
          kind: 'range',
          id: StepCurveControlId.RadiusX,
          label: 'x 半径',
          defaultValue: 80,
          min: 20,
          max: 100,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Ellipse,
        },
        {
          kind: 'range',
          id: StepCurveControlId.RadiusY,
          label: 'y 半径',
          defaultValue: 45,
          min: 20,
          max: 90,
          step: 5,
          visibleWhen: StepCurveVisibleWhen.Ellipse,
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: stepCurvesControls,
  canonicalValues: {
    stepKind: 'curve',
    control: [0, -70],
    control1: [-40, -70],
    control2: [40, 70],
    bendDirection: 'left',
    bendAngle: 30,
    tension: 1,
    startAngle: 0,
    endAngle: 120,
    radius: 60,
    radiusX: 80,
    radiusY: 45,
  },
  relatedApis: ['Step.kind', 'Step.to'],
} satisfies PreviewControlContract;
