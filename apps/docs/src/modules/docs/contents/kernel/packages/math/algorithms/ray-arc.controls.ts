import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { rayArcI18n } from './ray-arc.i18n';

/** 射线圆弧 playground 的稳定字段 id */
export const RayArcPlaygroundControlId = {
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
} as const;

/** 射线圆弧起止角度控制面板 */
export const createRayArcPlaygroundControls = (i18n: typeof rayArcI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'range',
            id: RayArcPlaygroundControlId.StartAngle,
            label: i18n.label3,
            defaultValue: 150,
            min: 0,
            max: 540,
            step: 15,
          },
          {
            kind: 'range',
            id: RayArcPlaygroundControlId.EndAngle,
            label: i18n.label4,
            defaultValue: 390,
            min: 0,
            max: 540,
            step: 15,
          },
        ],
      },
    ],
  });

export const rayArcPlaygroundControls = createRayArcPlaygroundControls(rayArcI18n.zh);

/** 射线圆弧 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = rayArcI18n[lang];

  return {
    controls: createRayArcPlaygroundControls(i18n),
    canonicalValues: { startAngle: 150, endAngle: 390 },
    presets: [
      { id: 'two-hits', label: i18n.label5, values: { startAngle: 150, endAngle: 390 } },
      { id: 'one-hit', label: i18n.label6, values: { startAngle: 210, endAngle: 510 } },
      { id: 'reverse-sweep', label: i18n.label7, values: { startAngle: 390, endAngle: 150 } },
    ],
    relatedApis: ['RayArcIntersectionInput', 'intersectRayWithArc'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
