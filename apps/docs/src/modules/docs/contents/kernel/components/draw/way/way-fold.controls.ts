import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Way 折角方向的中文属性面板 */
export const wayFoldControls = definePreviewControls({
  presentation: 'panel',
  title: '折角',
  sections: [
    {
      label: '路径',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '折角方向',
          defaultValue: '-|',
          options: [
            { value: '-|', label: '水平 → 垂直' },
            { value: '|-', label: '垂直 → 水平' },
          ],
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: wayFoldControls,
  canonicalValues: { direction: '-|' },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
