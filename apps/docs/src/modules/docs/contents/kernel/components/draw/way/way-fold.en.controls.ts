import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for the Way fold direction */
export const wayFoldControls = definePreviewControls({
  presentation: 'panel',
  title: 'Fold',
  sections: [
    {
      label: 'Path',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Fold direction',
          defaultValue: '-|',
          options: [
            { value: '-|', label: 'Horizontal → vertical' },
            { value: '|-', label: 'Vertical → horizontal' },
            { value: '-|-', label: 'Horizontal → vertical → horizontal' },
            { value: '|-|', label: 'Vertical → horizontal → vertical' },
          ],
        },
        {
          kind: 'range',
          id: 'fraction',
          label: 'Middle position',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'direction', oneOf: ['-|-', '|-|'] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: wayFoldControls,
  canonicalValues: { direction: '-|', fraction: 0.5 },
  relatedApis: ['Draw.way', 'WayFoldOp.fraction'],
} satisfies PreviewControlContract;
