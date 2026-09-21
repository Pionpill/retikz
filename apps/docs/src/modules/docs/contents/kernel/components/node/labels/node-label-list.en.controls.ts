import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelListControlId } from './node-label-list.controls';

export const nodeLabelListControls = definePreviewControls({
  presentation: 'panel',
  title: 'Add labels',
  sections: [
    {
      label: 'Number of labels',
      controls: [
        {
          kind: 'select',
          id: NodeLabelListControlId.Mode,
          label: 'Form',
          defaultValue: 'single',
          options: [
            { value: 'single', label: 'Single object' },
            { value: 'multiple', label: 'Object array' },
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
