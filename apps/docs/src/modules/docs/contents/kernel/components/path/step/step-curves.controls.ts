import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { stepCurvesControlsI18n } from './step-curves.i18n';

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
const createControls = (lang: Lang) => {
  const i18n = stepCurvesControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.stepCurves,
    sections: [
      {
        label: i18n.curveType,
        controls: [
          {
            kind: 'select',
            id: StepCurveControlId.Kind,
            label: i18n.kind,
            defaultValue: 'curve',
            options: [
              { value: 'curve', label: i18n.quadraticBezier },
              { value: 'cubic', label: i18n.cubicBezier },
              { value: 'bend', label: i18n.bendShorthand },
              { value: 'smooth', label: i18n.smoothThroughPoints },
              { value: 'arc', label: i18n.arc },
              { value: 'circlePath', label: i18n.fullCircle },
              { value: 'ellipsePath', label: i18n.fullEllipse },
            ],
          },
        ],
      },
      {
        label: i18n.bezierAndSmooth,
        controls: [
          {
            kind: 'point',
            id: StepCurveControlId.Control,
            label: i18n.controlPoint,
            defaultValue: [0, -70],
            min: [-100, -100],
            max: [100, 100],
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Curve,
          },
          {
            kind: 'point',
            id: StepCurveControlId.Control1,
            label: i18n.controlPoint2,
            defaultValue: [-40, -70],
            min: [-100, -100],
            max: [100, 100],
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Cubic,
          },
          {
            kind: 'point',
            id: StepCurveControlId.Control2,
            label: i18n.controlPoint3,
            defaultValue: [40, 70],
            min: [-100, -100],
            max: [100, 100],
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Cubic,
          },
          {
            kind: 'select',
            id: StepCurveControlId.BendDirection,
            label: i18n.bendDirection,
            defaultValue: 'left',
            visibleWhen: StepCurveVisibleWhen.Bend,
            options: [
              { value: 'left', label: i18n.left },
              { value: 'right', label: i18n.right },
            ],
          },
          {
            kind: 'range',
            id: StepCurveControlId.BendAngle,
            label: i18n.bendAngle,
            defaultValue: 30,
            min: 5,
            max: 80,
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Bend,
          },
          {
            kind: 'range',
            id: StepCurveControlId.Tension,
            label: i18n.tension,
            defaultValue: 1,
            min: 0.2,
            max: 2,
            step: 0.1,
            visibleWhen: StepCurveVisibleWhen.Smooth,
          },
        ],
      },
      {
        label: i18n.anglesAndRadii,
        controls: [
          {
            kind: 'range',
            id: StepCurveControlId.StartAngle,
            label: i18n.startAngle,
            defaultValue: 0,
            min: -180,
            max: 360,
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Arc,
          },
          {
            kind: 'range',
            id: StepCurveControlId.EndAngle,
            label: i18n.endAngle,
            defaultValue: 120,
            min: -180,
            max: 360,
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Arc,
          },
          {
            kind: 'range',
            id: StepCurveControlId.Radius,
            label: i18n.radius,
            defaultValue: 60,
            min: 20,
            max: 90,
            step: 5,
            visibleWhen: { controlId: StepCurveControlId.Kind, oneOf: ['arc', 'circlePath'] },
          },
          {
            kind: 'range',
            id: StepCurveControlId.RadiusX,
            label: i18n.radiusX,
            defaultValue: 80,
            min: 20,
            max: 100,
            step: 5,
            visibleWhen: StepCurveVisibleWhen.Ellipse,
          },
          {
            kind: 'range',
            id: StepCurveControlId.RadiusY,
            label: i18n.radiusY,
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
};

/** 默认中文控件，用于推导控件值类型 */
export const stepCurvesControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
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
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
