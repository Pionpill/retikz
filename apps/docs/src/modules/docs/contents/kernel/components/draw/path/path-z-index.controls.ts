import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 栈序的中文属性面板 */
export const pathZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: '栈序',
  sections: [
    {
      label: '重叠',
      controls: [{ kind: 'range', id: 'zIndex', label: '蓝色 zIndex', defaultValue: 1, min: -1, max: 2, step: 1 }],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathZIndexControls,
  canonicalValues: { zIndex: 1 },
  relatedApis: ['Path.zIndex'],
} satisfies PreviewControlContract;
