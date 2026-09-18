import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { drawCurveControlsI18n } from './draw-curve.i18n';

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
const createControls = (lang: Lang) => {
  const i18n = drawCurveControlsI18n[lang];
  return definePreviewControls({
    presentation: 'panel',
    title: i18n.drawCurves,
    sections: [
      {
        label: i18n.curveType,
        controls: [
          {
            kind: 'select',
            id: DrawCurveControlId.Kind,
            label: i18n.wayOperator,
            defaultValue: 'curve',
            options: [
              { value: 'curve', label: i18n.quadraticBezier },
              { value: 'cubic', label: i18n.cubicBezier },
              { value: 'bend', label: i18n.bendShorthand },
              { value: 'arc', label: i18n.arc },
              { value: 'circle', label: i18n.fullCircle },
              { value: 'ellipse', label: i18n.fullEllipse },
            ],
          },
        ],
      },
      {
        label: i18n.bezierParameters,
        controls: [
          {
            kind: 'point',
            id: DrawCurveControlId.Control,
            label: i18n.controlPoint,
            defaultValue: [100, -70],
            min: [0, -100],
            max: [200, 100],
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Curve,
          },
          {
            kind: 'point',
            id: DrawCurveControlId.Control1,
            label: i18n.controlPoint2,
            defaultValue: [60, -70],
            min: [0, -100],
            max: [200, 100],
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Cubic,
          },
          {
            kind: 'point',
            id: DrawCurveControlId.Control2,
            label: i18n.controlPoint3,
            defaultValue: [140, 70],
            min: [0, -100],
            max: [200, 100],
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Cubic,
          },
        ],
      },
      {
        label: i18n.bendAndArc,
        controls: [
          {
            kind: 'select',
            id: DrawCurveControlId.BendDirection,
            label: i18n.bendDirection,
            defaultValue: 'left',
            visibleWhen: DrawCurveVisibleWhen.Bend,
            options: [
              { value: 'left', label: i18n.left },
              { value: 'right', label: i18n.right },
            ],
          },
          {
            kind: 'range',
            id: DrawCurveControlId.BendAngle,
            label: i18n.bendAngle,
            defaultValue: 30,
            min: 5,
            max: 80,
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Bend,
          },
          {
            kind: 'range',
            id: DrawCurveControlId.StartAngle,
            label: i18n.startAngle,
            defaultValue: 0,
            min: -180,
            max: 360,
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Arc,
          },
          {
            kind: 'range',
            id: DrawCurveControlId.EndAngle,
            label: i18n.endAngle,
            defaultValue: 120,
            min: -180,
            max: 360,
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Arc,
          },
        ],
      },
      {
        label: i18n.radius,
        controls: [
          {
            kind: 'range',
            id: DrawCurveControlId.Radius,
            label: i18n.radius2,
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
            label: i18n.radiusX,
            defaultValue: 80,
            min: 20,
            max: 100,
            step: 5,
            visibleWhen: DrawCurveVisibleWhen.Ellipse,
          },
          {
            kind: 'range',
            id: DrawCurveControlId.RadiusY,
            label: i18n.radiusY,
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
};

/** 默认中文控件，用于推导控件值类型 */
export const drawCurveControls = createControls('zh');

/** 当前 controls 面板的稳定文档契约 */
export const createPreviewControlContract = (lang: Lang) =>
  ({
    controls: createControls(lang),
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
  }) satisfies PreviewControlContract;

/** 默认中文预览契约 */
export const previewControlContract = createPreviewControlContract('zh');
