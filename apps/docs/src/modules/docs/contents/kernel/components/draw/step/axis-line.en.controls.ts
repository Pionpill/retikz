import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English property panel for Step orthogonal connections */
export const axisLineControls = definePreviewControls({
  presentation: 'panel',
  title: 'Orthogonal connections',
  sections: [
    {
      label: 'Connection',
      controls: [
        {
          kind: 'select',
          id: 'connection',
          label: 'Connection type',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: 'Horizontal axis' },
            { value: 'vertical', label: 'Vertical axis' },
            { value: 'fold', label: 'Fold connection' },
          ],
        },
      ],
    },
    {
      label: 'Fold',
      visibleWhen: { controlId: 'connection', oneOf: ['fold'] },
      controls: [
        {
          kind: 'select',
          id: 'via',
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
          visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: axisLineControls,
  canonicalValues: { connection: 'horizontal', via: '-|', fraction: 0.5 },
  relatedApis: ['Step.kind', 'Step.axis', 'Step.via', 'Step.fraction'],
} satisfies PreviewControlContract;
