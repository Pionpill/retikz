import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { boundsPlaygroundI18n } from './bounds-playground.i18n';

/** 边界 playground 的稳定字段 id */
export const BoundsPlaygroundControlId = {
  AX: 'aX',
  AY: 'aY',
  BX: 'bX',
  BY: 'bY',
  CX: 'cX',
  CY: 'cY',
  ARC_START_ANGLE: 'arcStartAngle',
  ARC_END_ANGLE: 'arcEndAngle',
} as const;

/** 边界点集的中文属性面板 */
export const createBoundsPlaygroundControls = (i18n: typeof boundsPlaygroundI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.AX,
            label: i18n.label3,
            defaultValue: -70,
            min: -100,
            max: 100,
            step: 10,
          },
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.AY,
            label: i18n.label4,
            defaultValue: -20,
            min: -80,
            max: 80,
            step: 10,
          },
        ],
      },
      {
        label: i18n.label5,
        controls: [
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.BX,
            label: i18n.label6,
            defaultValue: 0,
            min: -100,
            max: 100,
            step: 10,
          },
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.BY,
            label: i18n.label7,
            defaultValue: 50,
            min: -80,
            max: 80,
            step: 10,
          },
        ],
      },
      {
        label: i18n.label8,
        controls: [
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.CX,
            label: i18n.label9,
            defaultValue: 70,
            min: -100,
            max: 100,
            step: 10,
          },
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.CY,
            label: i18n.label10,
            defaultValue: -10,
            min: -80,
            max: 80,
            step: 10,
          },
        ],
      },
      {
        label: i18n.label11,
        controls: [
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.ARC_START_ANGLE,
            label: i18n.label12,
            defaultValue: 200,
            min: 0,
            max: 270,
            step: 5,
          },
          {
            kind: 'range',
            id: BoundsPlaygroundControlId.ARC_END_ANGLE,
            label: i18n.label13,
            defaultValue: 340,
            min: 90,
            max: 350,
            step: 5,
          },
        ],
      },
    ],
  });

export const boundsPlaygroundControls = createBoundsPlaygroundControls(boundsPlaygroundI18n.zh);

/** 边界 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = boundsPlaygroundI18n[lang];

  return {
    controls: createBoundsPlaygroundControls(i18n),
    canonicalValues: {
      aX: -70,
      aY: -20,
      bX: 0,
      bY: 50,
      cX: 70,
      cY: -10,
      arcStartAngle: 200,
      arcEndAngle: 340,
    },
    presets: [
      {
        id: 'triangle',
        label: i18n.label14,
        values: {
          aX: -70,
          aY: -20,
          bX: 0,
          bY: 50,
          cX: 70,
          cY: -10,
          arcStartAngle: 200,
          arcEndAngle: 340,
        },
      },
      {
        id: 'wide',
        label: i18n.label15,
        values: {
          aX: -100,
          aY: 20,
          bX: 0,
          bY: -35,
          cX: 100,
          cY: 25,
          arcStartAngle: 200,
          arcEndAngle: 340,
        },
      },
      {
        id: 'vertical',
        label: i18n.label16,
        values: {
          aX: -25,
          aY: -70,
          bX: 55,
          bY: 0,
          cX: -10,
          cY: 70,
          arcStartAngle: 270,
          arcEndAngle: 90,
        },
      },
    ],
    relatedApis: ['collectArcBoundingCandidates', 'boundsOf', 'boundsToRect'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
