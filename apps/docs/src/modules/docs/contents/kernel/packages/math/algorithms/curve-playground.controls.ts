import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { curvePlaygroundI18n } from './curve-playground.i18n';
import { definePreviewControls } from '@/modules/docs/preview';

/** 曲线 playground 的稳定字段 id */
export const CurvePlaygroundControlId = {
  PointSet: 'pointSet',
  ControlPoint: 'controlPoint',
  Tension: 'tension',
} as const;

/** 点集与张力的中文属性面板 */
export const createCurvePlaygroundControls = (i18n: typeof curvePlaygroundI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: CurvePlaygroundControlId.PointSet,
            label: i18n.label3,
            defaultValue: 'uneven',
            options: [
              { value: 'uneven', label: i18n.label4 },
              { value: 'zigzag', label: i18n.label5 },
              { value: 'coincident', label: i18n.label6 },
            ],
          },
          {
            kind: 'point',
            id: CurvePlaygroundControlId.ControlPoint,
            label: i18n.label7,
            defaultValue: [-25, 15],
            min: [-150, -80],
            max: [150, 80],
            step: 5,
          },
          {
            kind: 'range',
            id: CurvePlaygroundControlId.Tension,
            label: i18n.label8,
            defaultValue: 1,
            min: 0.2,
            max: 2,
            step: 0.1,
          },
        ],
      },
    ],
  });

export const curvePlaygroundControls = createCurvePlaygroundControls(curvePlaygroundI18n.zh);

/** 曲线 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = curvePlaygroundI18n[lang];

  return {
    controls: createCurvePlaygroundControls(i18n),
    canonicalValues: { pointSet: 'uneven', controlPoint: [-25, 15], tension: 1 },
    presets: [
      { id: 'uneven', label: i18n.label9, values: { pointSet: 'uneven', tension: 1 } },
      { id: 'zigzag', label: i18n.label10, values: { pointSet: 'zigzag', tension: 0.7 } },
      { id: 'coincident', label: i18n.label11, values: { pointSet: 'coincident', tension: 1 } },
    ],
    relatedApis: ['curve.catmullRomToCubic', 'CubicSegment'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
