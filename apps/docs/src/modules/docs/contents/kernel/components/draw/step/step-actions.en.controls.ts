import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Step basic-action controls in English */
export const stepActionsEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Step basic actions',
  sections: [
    {
      label: 'Action',
      controls: [
        {
          kind: 'select',
          id: 'actionKind',
          label: 'kind',
          defaultValue: 'line',
          options: [
            { value: 'line', label: 'Line' },
            { value: 'move', label: 'Multiple subpaths' },
            { value: 'fold', label: 'Fold' },
            { value: 'cycle', label: 'Cycle' },
            { value: 'rectangle', label: 'Rectangle' },
          ],
        },
        {
          kind: 'select',
          id: 'via',
          label: 'via',
          defaultValue: '-|',
          visibleWhen: { controlId: 'actionKind', oneOf: ['fold'] },
          options: [
            { value: '-|', label: 'Horizontal then vertical' },
            { value: '|-', label: 'Vertical then horizontal' },
            { value: '-|-', label: 'Horizontal → vertical → horizontal' },
            { value: '|-|', label: 'Vertical → horizontal → vertical' },
          ],
        },
        {
          kind: 'range',
          id: 'fraction',
          label: 'fraction',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
        },
        {
          kind: 'range',
          id: 'cornerRadius',
          label: 'cornerRadius',
          defaultValue: 12,
          min: 0,
          max: 40,
          step: 2,
          visibleWhen: { controlId: 'actionKind', oneOf: ['rectangle'] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: stepActionsEnControls,
  canonicalValues: { actionKind: 'line', via: '-|', fraction: 0.5, cornerRadius: 12 },
  relatedApis: ['Step.kind', 'Step.via', 'Step.fraction', 'Step.to'],
} satisfies PreviewControlContract;
