import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Way 闭合状态的中文属性面板 */
export const wayCycleControls = definePreviewControls({
  presentation: 'panel',
  title: '闭合',
  sections: [
    {
      label: '路径',
      controls: [
        {
          kind: 'select',
          id: 'state',
          label: '路径状态',
          defaultValue: 'open',
          options: [
            { value: 'open', label: '开放路径' },
            { value: 'closed', label: '闭合路径' },
          ],
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: wayCycleControls,
  canonicalValues: { state: 'open' },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
