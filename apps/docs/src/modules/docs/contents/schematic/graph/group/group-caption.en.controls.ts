import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { GroupCaptionControlId } from './group-caption.controls';

/** English controls for the Group caption playground */
export const groupCaptionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Group caption',
  sections: [
    {
      label: 'Position and arrangement',
      controls: [
        {
          kind: 'select',
          id: GroupCaptionControlId.Side,
          label: 'Position',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        {
          kind: 'select',
          id: GroupCaptionControlId.Direction,
          label: 'Direction',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ],
        },
      ],
    },
    {
      label: 'Spacing',
      controls: [
        {
          kind: 'range',
          id: GroupCaptionControlId.ItemGap,
          label: 'Title-description gap',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: GroupCaptionControlId.BodyGap,
          label: 'Body-caption gap',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
  ],
});

/** Stable English documentation contract for the Group caption playground */
export const previewControlContract = {
  controls: groupCaptionControls,
  canonicalValues: {
    side: 'top',
    direction: 'horizontal',
    itemGap: 4,
    bodyGap: 4,
  },
  relatedApis: ['Group.caption.side', 'Group.caption.direction', 'Group.caption.itemGap', 'Group.caption.bodyGap'],
} satisfies PreviewControlContract;
