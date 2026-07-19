import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Step label controls in English */
export const stepLabelEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step edge label',
  sections: [
    {
      label: 'Position and text',
      controls: [
        { kind: 'range', id: 'position', label: 'position', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        {
          kind: 'select',
          id: 'side',
          label: 'side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        { kind: 'switch', id: 'sloped', label: 'Rotate along path', defaultValue: false },
        { kind: 'color', id: 'textColor', label: 'Text color', defaultValue: '#6b7280' },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: stepLabelEnControls,
  canonicalValues: { position: 0.5, side: 'top', sloped: false, textColor: '#6b7280' },
  relatedApis: ['Step.label'],
} satisfies PreviewControlContract;
