import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 凸包 playground 的稳定字段 id */
export const ConvexHullPlaygroundControlId = {
  PointSet: 'pointSet',
} as const;

/** 凸包输入点集控制面板 */
export const convexHullPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '凸包',
  sections: [
    {
      label: '输入',
      controls: [
        {
          kind: 'select',
          id: ConvexHullPlaygroundControlId.PointSet,
          label: '点集',
          defaultValue: 'concave',
          options: [
            { value: 'concave', label: '凹形点集' },
            { value: 'duplicates', label: '含重复与共线点' },
          ],
        },
      ],
    },
  ],
});

/** 凸包 playground 的稳定状态、预设与 API 覆盖 */
export const previewControlContract = {
  controls: convexHullPlaygroundControls,
  canonicalValues: { pointSet: 'concave' },
  presets: [
    { id: 'concave', label: '凹形边界', values: { pointSet: 'concave' } },
    { id: 'duplicates', label: '去重与去共线', values: { pointSet: 'duplicates' } },
  ],
  relatedApis: ['convexHull'],
} satisfies PreviewControlContract;
