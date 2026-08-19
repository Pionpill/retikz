import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { TrapezoidExampleControlId } from './trapezoid-example.controls';

/** Controls for the Trapezoid example */
export const trapezoidExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Trapezoid',
  sections: [
    {
      label: 'Contour parameters',
      controls: [
        {
          kind: 'select',
          id: TrapezoidExampleControlId.ShortSide,
          label: 'Short side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'range',
          id: TrapezoidExampleControlId.ShortSideRatio,
          label: 'Short-side ratio',
          defaultValue: 0.72,
          min: 0.3,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'range',
          id: TrapezoidExampleControlId.CornerRadius,
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

/** Stable documentation contract for the Trapezoid example */
export const previewControlContract = {
  controls: trapezoidExampleControls,
  canonicalValues: { shortSide: 'top', shortSideRatio: 0.72, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
