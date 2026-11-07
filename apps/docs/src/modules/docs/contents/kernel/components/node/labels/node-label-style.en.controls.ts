import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { NodeLabelStyleControlId } from './node-label-style.controls';

export const nodeLabelStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Label style',
  sections: [
    {
      controls: [
        {
          kind: 'select',
          id: 'textAlign',
          label: 'Text alignment',
          defaultValue: 'middle',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'middle', label: 'Middle' },
            { value: 'end', label: 'End' },
          ],
        },
        { kind: 'range', id: 'lineHeight', label: 'Line height', defaultValue: 20, min: 10, max: 40, step: 1 },
        { kind: 'range', id: 'maxTextWidth', label: 'Wrap width', defaultValue: 100, min: 40, max: 180, step: 5 },
        { kind: 'switch', id: NodeLabelStyleControlId.Multiline, label: 'Multiline text', defaultValue: true },
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
    multiline: true,
    textAlign: 'middle',
    lineHeight: 20,
    maxTextWidth: 100,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
