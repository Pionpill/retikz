import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 出入射角的中文属性面板 */
export const pathOutInLoopControls = definePreviewControls({
  presentation: 'panel',
  title: '出入射角',
  sections: [
    {
      label: '路径',
      controls: [
        {
          kind: 'select',
          id: 'mode',
          label: '模式',
          defaultValue: 'loop',
          options: [
            { value: 'loop', label: '自环' },
            { value: 'connect', label: '连接 S → T' },
          ],
        },
        { kind: 'range', id: 'outAngle', label: '出射角', defaultValue: 120, min: -180, max: 180, step: 5 },
        { kind: 'range', id: 'inAngle', label: '入射角', defaultValue: 60, min: -180, max: 180, step: 5 },
        {
          kind: 'range',
          id: 'loopLooseness',
          label: '自环松紧',
          defaultValue: 72,
          min: 48,
          max: 80,
          step: 8,
          visibleWhen: { controlId: 'mode', oneOf: ['loop'] },
        },
        {
          kind: 'range',
          id: 'looseness',
          label: '连线松紧',
          defaultValue: 1,
          min: 0.5,
          max: 2,
          step: 0.1,
          visibleWhen: { controlId: 'mode', oneOf: ['connect'] },
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathOutInLoopControls,
  canonicalValues: { mode: 'loop', outAngle: 120, inAngle: 60, loopLooseness: 72, looseness: 1 },
  relatedApis: ['Step.outAngle', 'Step.inAngle', 'Step.looseness'],
} satisfies PreviewControlContract;
