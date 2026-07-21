import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodeZIndexControlId } from './node-z-index.controls';

/** Node stacking property panel in English */
export const nodeZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: 'Stacking order',
  sections: [
    {
      label: 'zIndex',
      controls: [
        {
          kind: 'range',
          id: NodeZIndexControlId.A,
          label: 'a zIndex',
          defaultValue: 2,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeZIndexControlId.B,
          label: 'b zIndex',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeZIndexControlId.C,
          label: 'c zIndex',
          defaultValue: 0,
          min: -2,
          max: 4,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node z-index controls */
export const previewControlContract = {
  controls: nodeZIndexControls,
  canonicalValues: { zIndexA: 2, zIndexB: 0, zIndexC: 0 },
  relatedApis: ['Node.zIndex'],
} satisfies PreviewControlContract;
