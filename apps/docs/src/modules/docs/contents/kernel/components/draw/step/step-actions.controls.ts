import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Step 基本动作的中文属性面板 */
export const stepActionsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step 基本动作',
  sections: [
    {
      label: '动作',
      controls: [
        {
          kind: 'select',
          id: 'actionKind',
          label: 'kind',
          defaultValue: 'line',
          options: [
            { value: 'line', label: '直线' },
            { value: 'move', label: '多子路径' },
            { value: 'fold', label: '折角' },
            { value: 'cycle', label: '闭合' },
            { value: 'rectangle', label: '矩形' },
          ],
        },
        {
          kind: 'select',
          id: 'via',
          label: 'via',
          defaultValue: '-|',
          visibleWhen: { controlId: 'actionKind', oneOf: ['fold'] },
          options: [
            { value: '-|', label: '先水平后垂直' },
            { value: '|-', label: '先垂直后水平' },
            { value: '-|-', label: '水平 → 垂直 → 水平' },
            { value: '|-|', label: '垂直 → 水平 → 垂直' },
          ],
        },
        {
          kind: 'range',
          id: 'fraction',
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
        },
        {
          kind: 'range',
          id: 'cornerRadius',
          label: 'cornerRadius',
          defaultValue: 12,
          min: 0,
          max: 40,
          step: 2,
          visibleWhen: { controlId: 'actionKind', oneOf: ['rectangle'] },
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: stepActionsControls,
  canonicalValues: { actionKind: 'line', via: '-|', fraction: 0.5, cornerRadius: 12 },
  relatedApis: ['Step.kind', 'Step.via', 'Step.fraction', 'Step.to'],
} satisfies PreviewControlContract;
