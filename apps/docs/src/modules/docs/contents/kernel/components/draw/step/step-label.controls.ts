import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Step label 的中文属性面板 */
export const stepLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step 边标注',
  sections: [
    {
      label: '位置与文字',
      controls: [
        { kind: 'range', id: 'position', label: 'position', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        {
          kind: 'select',
          id: 'side',
          label: 'side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上' },
            { value: 'bottom', label: '下' },
            { value: 'left', label: '左' },
            { value: 'right', label: '右' },
          ],
        },
        { kind: 'switch', id: 'sloped', label: '沿路径旋转', defaultValue: false },
        { kind: 'color', id: 'textColor', label: '文字颜色', defaultValue: '#6b7280' },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: stepLabelControls,
  canonicalValues: { position: 0.5, side: 'top', sloped: false, textColor: '#6b7280' },
  relatedApis: ['Step.label'],
} satisfies PreviewControlContract;
