import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Step 目标定位的中文属性面板 */
export const stepTargetingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step 目标定位',
  sections: [
    {
      label: '目标形态',
      controls: [
        {
          kind: 'select',
          id: 'targetKind',
          label: 'to',
          defaultValue: 'offset',
          options: [
            { value: 'offset', label: '引用点偏移' },
            { value: 'relative', label: '相对坐标' },
            { value: 'relativeAccumulate', label: '累积相对坐标' },
          ],
        },
        { kind: 'range', id: 'offsetX', label: 'x', defaultValue: 80, min: -40, max: 120, step: 5 },
        { kind: 'range', id: 'offsetY', label: 'y', defaultValue: -35, min: -70, max: 30, step: 5 },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: stepTargetingControls,
  canonicalValues: { targetKind: 'offset', offsetX: 80, offsetY: -35 },
  relatedApis: ['Step.to'],
} satisfies PreviewControlContract;
