import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { InspectSelectionControlId, InspectSelectionTarget } from './inspect-selection.controls';

/** English controls for Inspector selection, options, and barriers */
export const inspectSelectionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Inspection scope',
  sections: [
    {
      label: 'Selection',
      controls: [
        {
          kind: 'select',
          id: InspectSelectionControlId.Target,
          label: 'Inspect path',
          defaultValue: InspectSelectionTarget.Both,
          options: [
            { value: InspectSelectionTarget.Left, label: 'Left path' },
            { value: InspectSelectionTarget.Right, label: 'Right path' },
            { value: InspectSelectionTarget.Both, label: 'Both paths' },
          ],
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.ControlPoints,
          label: 'Control points',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.Labels,
          label: 'Control-point labels',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: InspectSelectionControlId.BarrierRight,
          label: 'Block right subtree',
          defaultValue: false,
        },
      ],
    },
  ],
});

/** Stable state and API coverage for the English selection playground */
export const previewControlContract = {
  controls: inspectSelectionControls,
  canonicalValues: {
    target: InspectSelectionTarget.Both,
    controlPoints: true,
    labels: true,
    barrierRight: false,
  },
  relatedApis: ['InspectPath.request', 'InspectScope.request', 'StrokePathInspectOptionsInputSchema'],
} satisfies PreviewControlContract;
