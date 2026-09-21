import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelSpacingControlId } from './node-label-spacing.controls';

export const nodeLabelSpacingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Spacing and placement',
  sections: [
    {
      label: 'Placement',
      controls: [
        {
          kind: 'select',
          id: NodeLabelSpacingControlId.Direction,
          label: 'Direction',
          defaultValue: 'right',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'right', label: 'Right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelSpacingControlId.Placement,
          label: 'Side',
          defaultValue: 'outside',
          options: [
            { value: 'outside', label: 'Outside' },
            { value: 'inside', label: 'Inside' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelSpacingControlId.Distance,
          label: 'Visual-box gap',
          defaultValue: 12,
          min: 0,
          max: 60,
          step: 2,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelSpacingControls,
  canonicalValues: { direction: 'right', placement: 'outside', distance: 12 },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
