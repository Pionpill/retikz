import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ParallelogramExampleControlId } from './parallelogram-example.controls';

/** Controls for the Parallelogram example */
export const parallelogramExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Parallelogram',
  sections: [
    {
      label: 'Slant parameters',
      controls: [
        {
          kind: 'select',
          id: ParallelogramExampleControlId.Direction,
          label: 'Slant direction',
          defaultValue: 'right',
          options: [
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
        {
          kind: 'range',
          id: ParallelogramExampleControlId.Angle,
          label: 'Side angle',
          defaultValue: 70,
          min: 45,
          max: 90,
          step: 1,
        },
        {
          kind: 'range',
          id: ParallelogramExampleControlId.CornerRadius,
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

/** Stable documentation contract for the Parallelogram example */
export const previewControlContract = {
  controls: parallelogramExampleControls,
  canonicalValues: { slantDirection: 'right', slantAngle: 70, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
