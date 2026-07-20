import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

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
