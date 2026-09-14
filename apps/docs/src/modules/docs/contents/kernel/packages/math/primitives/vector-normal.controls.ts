import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { vectorNormalI18n } from './vector-normal.i18n';

/** 向量 playground 的稳定字段 id */
export const VectorNormalControlId = {
  Angle: 'angle',
  Length: 'length',
} as const;

/** 向量方向与长度的中文属性面板 */
export const createVectorNormalControls = (i18n: typeof vectorNormalI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'range',
            id: VectorNormalControlId.Angle,
            label: i18n.label3,
            defaultValue: -30,
            min: -180,
            max: 180,
            step: 5,
          },
          {
            kind: 'range',
            id: VectorNormalControlId.Length,
            label: i18n.label4,
            defaultValue: 120,
            min: 40,
            max: 140,
            step: 5,
          },
        ],
      },
    ],
  });

export const vectorNormalControls = createVectorNormalControls(vectorNormalI18n.zh);

/** 向量 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = vectorNormalI18n[lang];

  return {
    controls: createVectorNormalControls(i18n),
    canonicalValues: { angle: -30, length: 120 },
    presets: [
      { id: 'axis', label: i18n.label5, values: { angle: 0, length: 120 } },
      { id: 'diagonal', label: i18n.label6, values: { angle: -45, length: 110 } },
      { id: 'obtuse', label: i18n.label7, values: { angle: 135, length: 90 } },
    ],
    relatedApis: ['vector2.add', 'vector2.scale', 'vector2.fromAngleDegrees', 'vector2.normal'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
