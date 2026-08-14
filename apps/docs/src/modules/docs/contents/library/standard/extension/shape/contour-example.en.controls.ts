import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ContourExampleControlId } from './contour-example.controls';

/** Controls for the Contour example */
export const contourExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Contour',
  sections: [
    {
      label: 'Outline',
      controls: [
        {
          kind: 'select',
          id: ContourExampleControlId.Preset,
          label: 'Vertex preset',
          defaultValue: 'tag',
          options: [
            { value: 'tag', label: 'Tag' },
            { value: 'shield', label: 'Shield' },
            { value: 'notch', label: 'Notched' },
          ],
        },
        {
          kind: 'range',
          id: ContourExampleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Contour example */
export const previewControlContract = {
  controls: contourExampleControls,
  canonicalValues: { preset: 'tag', cornerRadius: 8 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
