import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CrowFootArrowControlId } from './crow-foot-arrow.controls';

/** Controls for the CrowFoot example */
export const crowFootArrowControls = definePreviewControls({
  presentation: 'panel',
  title: 'CrowFoot endpoint',
  sections: [
    {
      label: 'Endpoint parameters',
      controls: [
        {
          kind: 'range',
          id: CrowFootArrowControlId.Length,
          label: 'Length',
          defaultValue: 12,
          min: 4,
          max: 24,
          step: 1,
        },
        { kind: 'range', id: CrowFootArrowControlId.Width, label: 'Width', defaultValue: 16, min: 6, max: 28, step: 1 },
        {
          kind: 'range',
          id: CrowFootArrowControlId.LineWidth,
          label: 'Line width',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        { kind: 'color', id: CrowFootArrowControlId.Color, label: 'Color', defaultValue: '#ea580c' },
      ],
    },
  ],
});

/** Stable documentation contract for the CrowFoot example */
export const previewControlContract = {
  controls: crowFootArrowControls,
  canonicalValues: { length: 12, width: 16, lineWidth: 1.5, color: '#ea580c' },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
