import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SectorExampleControlId } from './sector-example.controls';

/** Controls for the Sector example */
export const sectorExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Sector',
  sections: [
    {
      label: 'Ring wedge geometry',
      controls: [
        {
          kind: 'range',
          id: SectorExampleControlId.InnerRadius,
          label: 'Inner radius',
          defaultValue: 24,
          min: 0,
          max: 48,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.OuterRadius,
          label: 'Outer radius',
          defaultValue: 68,
          min: 50,
          max: 84,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.StartAngle,
          label: 'Start angle',
          defaultValue: 25,
          min: 0,
          max: 300,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.EndAngle,
          label: 'End angle',
          defaultValue: 325,
          min: 60,
          max: 360,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorExampleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 4,
          min: 0,
          max: 16,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Sector example */
export const previewControlContract = {
  controls: sectorExampleControls,
  canonicalValues: { innerRadius: 24, outerRadius: 68, startAngle: 25, endAngle: 325, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
