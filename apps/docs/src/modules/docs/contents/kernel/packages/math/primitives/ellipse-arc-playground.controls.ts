import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { ellipseArcPlaygroundI18n } from './ellipse-arc-playground.i18n';
import { definePreviewControls } from '@/modules/docs/preview';

/** 椭圆与圆弧 playground 的稳定字段 id */
export const EllipseArcPlaygroundControlId = {
  EllipseRadiusX: 'ellipseRadiusX',
  EllipseRadiusY: 'ellipseRadiusY',
  ArcRadius: 'arcRadius',
  ArcStartAngle: 'arcStartAngle',
  ArcEndAngle: 'arcEndAngle',
} as const;

/** 椭圆与圆弧的中文属性面板 */
export const createEllipseArcPlaygroundControls = (i18n: typeof ellipseArcPlaygroundI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'range',
            id: EllipseArcPlaygroundControlId.EllipseRadiusX,
            label: i18n.label3,
            defaultValue: 45,
            min: 30,
            max: 65,
            step: 5,
          },
          {
            kind: 'range',
            id: EllipseArcPlaygroundControlId.EllipseRadiusY,
            label: i18n.label4,
            defaultValue: 28,
            min: 20,
            max: 50,
            step: 2,
          },
        ],
      },
      {
        label: i18n.label5,
        controls: [
          {
            kind: 'range',
            id: EllipseArcPlaygroundControlId.ArcRadius,
            label: i18n.label6,
            defaultValue: 42,
            min: 25,
            max: 60,
            step: 5,
          },
          {
            kind: 'range',
            id: EllipseArcPlaygroundControlId.ArcStartAngle,
            label: i18n.label7,
            defaultValue: 25,
            min: 0,
            max: 270,
            step: 5,
          },
          {
            kind: 'range',
            id: EllipseArcPlaygroundControlId.ArcEndAngle,
            label: i18n.label8,
            defaultValue: 250,
            min: 90,
            max: 350,
            step: 5,
          },
        ],
      },
    ],
  });

export const ellipseArcPlaygroundControls = createEllipseArcPlaygroundControls(ellipseArcPlaygroundI18n.zh);

/** 椭圆与圆弧 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = ellipseArcPlaygroundI18n[lang];

  return {
    controls: createEllipseArcPlaygroundControls(i18n),
    canonicalValues: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
    presets: [
      {
        id: 'balanced',
        label: i18n.label9,
        values: { ellipseRadiusX: 45, ellipseRadiusY: 28, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 250 },
      },
      {
        id: 'tall-ellipse',
        label: i18n.label10,
        values: { ellipseRadiusX: 35, ellipseRadiusY: 48, arcRadius: 42, arcStartAngle: 25, arcEndAngle: 145 },
      },
      {
        id: 'long-arc',
        label: i18n.label11,
        values: { ellipseRadiusX: 58, ellipseRadiusY: 24, arcRadius: 52, arcStartAngle: 20, arcEndAngle: 300 },
      },
    ],
    relatedApis: [
      'ellipse.inscribedInBox',
      'ellipse.center',
      'collectArcBoundingCandidates',
      'boundsOf',
      'boundsToRect',
    ],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
