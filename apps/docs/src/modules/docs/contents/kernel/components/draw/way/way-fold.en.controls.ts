import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for the Way fold direction */
export const wayFoldControls = definePreviewControls({
  presentation: 'panel',
  title: 'Fold',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Fold direction',
          defaultValue: '-|',
          options: [
            { value: '-|', label: 'Horizontal → vertical' },
            { value: '|-', label: 'Vertical → horizontal' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: wayFoldControls,
  canonicalValues: { direction: '-|' },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
