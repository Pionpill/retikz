import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SectorOpenExampleControlId } from './sector-open-example.controls';

/** Controls for the open Sector arc example */
export const sectorOpenExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Open arc',
  sections: [
    {
      label: 'Geometry',
      controls: [
        {
          kind: 'range',
          id: SectorOpenExampleControlId.Radius,
          label: 'Radius',
          defaultValue: 56,
          min: 24,
          max: 76,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorOpenExampleControlId.StartAngle,
          label: 'Start angle',
          defaultValue: 30,
          min: 0,
          max: 300,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorOpenExampleControlId.EndAngle,
          label: 'End angle',
          defaultValue: 300,
          min: 60,
          max: 360,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the open Sector arc example */
export const previewControlContract = {
  controls: sectorOpenExampleControls,
  canonicalValues: { radius: 56, startAngle: 30, endAngle: 300 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
