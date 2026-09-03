import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ArrowEndpointOverlapControlId } from './arrow-endpoint-overlap.controls';

const shapeOptions = [
  { label: 'Solid triangle', value: 'normal' },
  { label: 'Hollow triangle', value: 'open' },
  { label: 'Solid stealth', value: 'stealth' },
  { label: 'Hollow stealth', value: 'openStealth' },
  { label: 'Solid circle', value: 'circle' },
  { label: 'Hollow circle', value: 'openCircle' },
] as const;

/** English controls for the endpoint-overlap example */
export const arrowEndpointOverlapControls = definePreviewControls({
  presentation: 'panel',
  title: 'Endpoint overlap',
  sections: [
    {
      label: 'Arrow placement',
      controls: [
        {
          kind: 'select',
          id: ArrowEndpointOverlapControlId.Shape,
          label: 'Arrow shape',
          defaultValue: 'openCircle',
          options: shapeOptions,
        },
        {
          kind: 'range',
          id: ArrowEndpointOverlapControlId.Overlap,
          label: 'Inside ratio',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the endpoint-overlap example */
export const previewControlContract = {
  controls: arrowEndpointOverlapControls,
  canonicalValues: { shape: 'openCircle', overlap: 0.5 },
  relatedApis: ['Draw.arrowDetail', 'Draw.arrowPlacement'],
} satisfies PreviewControlContract;
