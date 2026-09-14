import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { convexHullI18n } from './convex-hull.i18n';

/** 凸包 playground 的稳定字段 id */
export const ConvexHullPlaygroundControlId = {
  PointSet: 'pointSet',
} as const;

/** 凸包输入点集控制面板 */
export const createConvexHullPlaygroundControls = (i18n: typeof convexHullI18n.zh) =>
  definePreviewControls({
    presentation: 'panel',
    title: i18n.label1,
    sections: [
      {
        label: i18n.label2,
        controls: [
          {
            kind: 'select',
            id: ConvexHullPlaygroundControlId.PointSet,
            label: i18n.label3,
            defaultValue: 'concave',
            options: [
              { value: 'concave', label: i18n.label4 },
              { value: 'duplicates', label: i18n.label5 },
            ],
          },
        ],
      },
    ],
  });

export const convexHullPlaygroundControls = createConvexHullPlaygroundControls(convexHullI18n.zh);

/** 凸包 playground 的稳定状态、预设与 API 覆盖 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = convexHullI18n[lang];

  return {
    controls: createConvexHullPlaygroundControls(i18n),
    canonicalValues: { pointSet: 'concave' },
    presets: [
      { id: 'concave', label: i18n.label6, values: { pointSet: 'concave' } },
      { id: 'duplicates', label: i18n.label7, values: { pointSet: 'duplicates' } },
    ],
    relatedApis: ['convexHull'],
  } satisfies PreviewControlContract;
};

export const previewControlContract = createPreviewControlContract('zh');
