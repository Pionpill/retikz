import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { GroupStyleControlId } from './group-style.controls';

/** English controls for the Group style playground */
export const groupStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group style',
  sections: [
    {
      label: 'Shell background',
      controls: [
        { kind: 'color', id: GroupStyleControlId.BackgroundColor, label: 'Background', defaultValue: '#e2e8f0' },
        {
          kind: 'range',
          id: GroupStyleControlId.BackgroundOpacity,
          label: 'Background opacity',
          defaultValue: 0.08,
          min: 0,
          max: 1,
          step: 0.02,
        },
        { kind: 'color', id: GroupStyleControlId.BorderColor, label: 'Border', defaultValue: '#64748b' },
        {
          kind: 'range',
          id: GroupStyleControlId.BorderWidth,
          label: 'Border width',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: GroupStyleControlId.BorderOpacity,
          label: 'Border opacity',
          defaultValue: 1,
          min: 0.1,
          max: 1,
          step: 0.1,
        },
        {
          kind: 'select',
          id: GroupStyleControlId.BorderLineStyle,
          label: 'Border line style',
          defaultValue: 'dashed',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
            { value: 'dotted', label: 'Dotted' },
          ],
        },
      ],
    },
    {
      label: 'Layout spacing',
      controls: [
        {
          kind: 'range',
          id: GroupStyleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 4,
          min: 0,
          max: 20,
          step: 2,
        },
        {
          kind: 'range',
          id: GroupStyleControlId.Padding,
          label: 'Padding',
          defaultValue: 10,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
  ],
});

/** Stable English documentation contract for the Group style playground */
export const previewControlContract = {
  controls: groupStyleControls,
  canonicalValues: {
    backgroundColor: '#e2e8f0',
    backgroundOpacity: 0.08,
    borderColor: '#64748b',
    borderWidth: 1,
    borderOpacity: 1,
    borderLineStyle: 'dashed',
    cornerRadius: 4,
    padding: 10,
  },
  relatedApis: ['Group.background', 'Group.border', 'Group.cornerRadius', 'Group.padding'],
} satisfies PreviewControlContract;
