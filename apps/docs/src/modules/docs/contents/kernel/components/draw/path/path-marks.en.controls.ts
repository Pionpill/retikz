import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for marks along a Path */
export const pathMarksControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path marks',
  sections: [
    {
      label: 'Position',
      controls: [
        { kind: 'range', id: 'firstPosition', label: 'Mark A', defaultValue: 0.25, min: 0, max: 1, step: 0.05 },
        { kind: 'range', id: 'secondPosition', label: 'Mark B', defaultValue: 0.75, min: 0, max: 1, step: 0.05 },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathMarksControls,
  canonicalValues: { firstPosition: 0.25, secondPosition: 0.75 },
  relatedApis: ['Path.marks'],
} satisfies PreviewControlContract;
