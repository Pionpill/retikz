import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Way 相对坐标对照的中文属性面板 */
export const wayRelativeControls = definePreviewControls({
  presentation: 'panel',
  title: '相对坐标',
  sections: [
    {
      label: '偏移',
      controls: [
        {
          kind: 'point',
          id: 'offset',
          label: '偏移',
          defaultValue: [90, 30],
          min: [30, -40],
          max: [100, 40],
          step: 10,
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: wayRelativeControls,
  canonicalValues: { offset: [90, 30] },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
