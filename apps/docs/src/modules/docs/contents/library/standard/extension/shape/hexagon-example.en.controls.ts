import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { HexagonExampleControlId } from './hexagon-example.controls';

/** Controls for the Hexagon example */
export const hexagonExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Elongated hexagon',
  sections: [
    {
      label: 'Shoulder parameters',
      controls: [
        {
          kind: 'range',
          id: HexagonExampleControlId.ShoulderDepth,
          label: 'Shoulder depth',
          defaultValue: 12,
          min: 0,
          max: 40,
          step: 1,
        },
        {
          kind: 'range',
          id: HexagonExampleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 4,
          min: 0,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Hexagon example */
export const previewControlContract = {
  controls: hexagonExampleControls,
  canonicalValues: { shoulderDepth: 12, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
