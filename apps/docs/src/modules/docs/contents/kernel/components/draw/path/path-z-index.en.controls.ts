import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English property panel for Path stacking */
export const pathZIndexControls = definePreviewControls({
  presentation: 'panel',
  title: 'Stacking',
  sections: [
    {
      label: 'Overlap',
      controls: [{ kind: 'range', id: 'zIndex', label: 'Blue zIndex', defaultValue: 1, min: -1, max: 2, step: 1 }],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathZIndexControls,
  canonicalValues: { zIndex: 1 },
  relatedApis: ['Path.zIndex'],
} satisfies PreviewControlContract;
