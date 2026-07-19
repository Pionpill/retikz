import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

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
          ],
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
  canonicalValues: { actionKind: 'line', via: '-|', cornerRadius: 12 },
  relatedApis: ['Step.kind', 'Step.to'],
} satisfies PreviewControlContract;
