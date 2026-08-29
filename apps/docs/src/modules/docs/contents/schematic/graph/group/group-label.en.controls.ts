import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { GroupLabelControlId } from './group-label.controls';

const positionOptions = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-right', label: 'Top right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-right', label: 'Bottom right' },
  { value: 'top', label: 'Top center' },
  { value: 'bottom', label: 'Bottom center' },
  { value: 'left', label: 'Left center' },
  { value: 'right', label: 'Right center' },
];

/** English controls for the Group label-position playground */
export const groupLabelControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group labels',
  sections: [
    {
      label: 'Label positions',
      controls: [
        {
          kind: 'select',
          id: GroupLabelControlId.PrimaryPosition,
          label: 'Label one',
          defaultValue: 'top-left',
          options: positionOptions,
        },
        {
          kind: 'select',
          id: GroupLabelControlId.SecondaryPosition,
          label: 'Label two',
          defaultValue: 'bottom-right',
          options: positionOptions,
        },
        {
          kind: 'select',
          id: GroupLabelControlId.DefaultPosition,
          label: 'Default label',
          defaultValue: 'default',
          options: [{ value: 'default', label: 'Default bottom-left' }, ...positionOptions],
        },
      ],
    },
  ],
});

/** Stable English documentation contract for the Group label-position playground */
export const previewControlContract = {
  controls: groupLabelControls,
  canonicalValues: {
    primaryPosition: 'top-left',
    secondaryPosition: 'bottom-right',
    defaultPosition: 'default',
  },
  relatedApis: ['Group.labels', 'NodeLabel.position'],
} satisfies PreviewControlContract;
