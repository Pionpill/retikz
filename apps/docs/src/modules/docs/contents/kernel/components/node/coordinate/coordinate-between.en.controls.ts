import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CoordinateBetweenControlId } from './coordinate-between.controls';

/** Between-position property panel in English */
export const coordinateBetweenControls = definePreviewControls({
  presentation: 'panel',
  title: 'Partway positioning',
  sections: [
    {
      label: 'between',
      controls: [
        {
          kind: 'range',
          id: CoordinateBetweenControlId.Fraction,
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Coordinate between controls */
export const previewControlContract = {
  controls: coordinateBetweenControls,
  canonicalValues: { fraction: 0.5 },
  relatedApis: ['Coordinate.position'],
} satisfies PreviewControlContract;
