import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for the Way closure state */
export const wayCycleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Closure',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'state',
          label: 'Path state',
          defaultValue: 'open',
          options: [
            { value: 'open', label: 'Open path' },
            { value: 'closed', label: 'Closed path' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: wayCycleControls,
  canonicalValues: { state: 'open' },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
