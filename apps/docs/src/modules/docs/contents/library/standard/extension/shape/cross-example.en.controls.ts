import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CrossExampleControlId } from './cross-example.controls';

/** Controls for the Cross example */
export const crossExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cross',
  sections: [
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'range',
          id: CrossExampleControlId.HorizontalWidth,
          label: 'Horizontal arm width',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.VerticalWidth,
          label: 'Vertical arm width',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.TopHeight,
          label: 'Top height',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.RightHeight,
          label: 'Right height',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.BottomHeight,
          label: 'Bottom height',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.LeftHeight,
          label: 'Left height',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        { kind: 'color', id: CrossExampleControlId.Fill, label: 'Fill', defaultValue: '#ffedd5' },
      ],
    },
  ],
});

/** Stable documentation contract for the Cross example */
export const previewControlContract = {
  controls: crossExampleControls,
  canonicalValues: {
    horizontalWidth: 14,
    verticalWidth: 14,
    topHeight: 48,
    rightHeight: 48,
    bottomHeight: 48,
    leftHeight: 48,
    fill: '#ffedd5',
  },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
