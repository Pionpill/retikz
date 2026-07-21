import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CoordinateFoldJunctionControlId } from './coordinate-fold-junction.controls';

/** Coordinate junction property panel in English */
export const coordinateFoldJunctionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path convergence',
  sections: [
    {
      label: 'position',
      controls: [
        {
          kind: 'range',
          id: CoordinateFoldJunctionControlId.JunctionX,
          label: 'position x',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
        {
          kind: 'range',
          id: CoordinateFoldJunctionControlId.JunctionY,
          label: 'position y',
          defaultValue: 0,
          min: -40,
          max: 40,
          step: 10,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Coordinate fold-junction controls */
export const previewControlContract = {
  controls: coordinateFoldJunctionControls,
  canonicalValues: { junctionX: 0, junctionY: 0 },
  relatedApis: ['Coordinate.position'],
} satisfies PreviewControlContract;
