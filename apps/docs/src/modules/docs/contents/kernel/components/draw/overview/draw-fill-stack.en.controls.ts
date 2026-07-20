import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw fill and stacking controls in English */
export const drawFillStackEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw fill and stacking',
  sections: [
    {
      label: 'Fill',
      controls: [
        { kind: 'color', id: 'fillA', label: 'Blue shape', defaultValue: '#1e90ff' },
        { kind: 'color', id: 'fillB', label: 'Red shape', defaultValue: '#ef4444' },
        {
          kind: 'range',
          id: 'fillOpacity',
          label: 'Fill opacity',
          defaultValue: 0.7,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Stacking',
      controls: [
        {
          kind: 'range',
          id: 'zIndexA',
          label: 'Blue zIndex',
          defaultValue: 0,
          min: -1,
          max: 2,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: drawFillStackEnControls,
  canonicalValues: { fillA: '#1e90ff', fillB: '#ef4444', fillOpacity: 0.7, zIndexA: 0 },
  relatedApis: ['Draw.fill', 'Draw.fillOpacity', 'Draw.zIndex'],
} satisfies PreviewControlContract;
