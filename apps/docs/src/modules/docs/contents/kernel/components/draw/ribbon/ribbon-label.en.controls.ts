import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for Ribbon labels */
export const ribbonLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon label',
  sections: [
    {
      label: 'Label',
      controls: [
        { kind: 'range', id: 'position', label: 'Position', defaultValue: 0.5, min: 0, max: 1, step: 0.05 },
        {
          kind: 'select',
          id: 'placement',
          label: 'Placement',
          defaultValue: 'inside',
          options: [
            { value: 'inside', label: 'Inside' },
            { value: 'side', label: 'Outside' },
          ],
        },
        {
          kind: 'select',
          id: 'side',
          label: 'Side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
          visibleWhen: { controlId: 'placement', oneOf: ['side'] },
        },
        { kind: 'switch', id: 'sloped', label: 'Rotate along path', defaultValue: true },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: ribbonLabelControls,
  canonicalValues: { position: 0.5, placement: 'inside', side: 'top', sloped: true },
  relatedApis: ['Path.label'],
} satisfies PreviewControlContract;
