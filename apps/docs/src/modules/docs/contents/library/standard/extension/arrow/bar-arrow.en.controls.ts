import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BarArrowControlId } from './bar-arrow.controls';

/** Controls for the Bar example */
export const barArrowControls = definePreviewControls({
  presentation: 'panel',
  title: 'Bar endpoint',
  sections: [
    {
      label: 'Endpoint parameters',
      controls: [
        { kind: 'range', id: BarArrowControlId.Length, label: 'Length', defaultValue: 10, min: 4, max: 20, step: 1 },
        { kind: 'range', id: BarArrowControlId.Width, label: 'Width', defaultValue: 14, min: 6, max: 24, step: 1 },
        {
          kind: 'range',
          id: BarArrowControlId.LineWidth,
          label: 'Line width',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        { kind: 'color', id: BarArrowControlId.Color, label: 'Color', defaultValue: '#ea580c' },
      ],
    },
  ],
});

/** Stable documentation contract for the Bar example */
export const previewControlContract = {
  controls: barArrowControls,
  canonicalValues: { length: 10, width: 14, lineWidth: 1.5, color: '#ea580c' },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
