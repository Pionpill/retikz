import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelListControlId = {
  Mode: 'mode',
} as const;

export const nodeLabelListControls = definePreviewControls({
  presentation: 'panel',
  title: '添加标签',
  sections: [
    {
      label: '标签数量',
      controls: [
        {
          kind: 'select',
          id: NodeLabelListControlId.Mode,
          label: '写法',
          defaultValue: 'single',
          options: [
            { value: 'single', label: '单个对象' },
            { value: 'multiple', label: '对象数组' },
          ],
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelListControls,
  canonicalValues: { mode: 'single' },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
