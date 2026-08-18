import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { RayArcPlaygroundControlId } from './ray-arc.controls';

/** English controls for the directed arc range */
export const rayArcPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ray and arc',
  sections: [
    {
      label: 'Arc range',
      controls: [
        {
          kind: 'range',
          id: RayArcPlaygroundControlId.StartAngle,
          label: 'Start angle',
          defaultValue: 150,
          min: 0,
          max: 540,
          step: 15,
        },
        {
          kind: 'range',
          id: RayArcPlaygroundControlId.EndAngle,
          label: 'End angle',
          defaultValue: 390,
          min: 0,
          max: 540,
          step: 15,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English ray-arc playground */
export const previewControlContract = {
  controls: rayArcPlaygroundControls,
  canonicalValues: { startAngle: 150, endAngle: 390 },
  presets: [
    { id: 'two-hits', label: 'Two intersections', values: { startAngle: 150, endAngle: 390 } },
    { id: 'one-hit', label: 'One intersection', values: { startAngle: 210, endAngle: 510 } },
    { id: 'reverse-sweep', label: 'Reverse sweep', values: { startAngle: 390, endAngle: 150 } },
  ],
  relatedApis: ['RayArcInput', 'rayArc'],
} satisfies PreviewControlContract;
