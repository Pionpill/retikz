import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelStyleControlId } from './node-label-style.controls';

export const nodeLabelStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Label style',
  sections: [
    {
      label: 'Text',
      controls: [
        { kind: 'color', id: NodeLabelStyleControlId.TextColor, label: 'Text color', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: NodeLabelStyleControlId.FontSize,
          label: 'Font size',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeLabelStyleControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelStyleControls,
  canonicalValues: {
    textColor: '#2563eb',
    fontSize: 16,
    opacity: 1,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
