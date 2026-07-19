import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Path 中段标记的中文属性面板 */
export const pathMarksControls = definePreviewControls({
  presentation: 'panel',
  title: '路径标记',
  sections: [
    {
      label: '位置',
      controls: [
        { kind: 'range', id: 'firstPosition', label: '标记 A', defaultValue: 0.25, min: 0, max: 1, step: 0.05 },
        { kind: 'range', id: 'secondPosition', label: '标记 B', defaultValue: 0.75, min: 0, max: 1, step: 0.05 },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathMarksControls,
  canonicalValues: { firstPosition: 0.25, secondPosition: 0.75 },
  relatedApis: ['Path.marks'],
} satisfies PreviewControlContract;
