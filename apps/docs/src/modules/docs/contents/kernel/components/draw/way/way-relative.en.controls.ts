import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for the Way relative-coordinate comparison */
export const wayRelativeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Relative coordinates',
  sections: [
    {
      label: 'Offset',
      controls: [
        {
          kind: 'point',
          id: 'offset',
          label: 'Offset',
          defaultValue: [90, 30],
          min: [30, -40],
          max: [100, 40],
          step: 10,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: wayRelativeControls,
  canonicalValues: { offset: [90, 30] },
  relatedApis: ['Draw.way'],
} satisfies PreviewControlContract;
