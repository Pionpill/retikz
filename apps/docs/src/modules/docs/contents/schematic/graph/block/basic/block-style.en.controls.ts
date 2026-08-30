import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BlockStyleControlId } from './block-style.controls';

/** English controls for the Block shell */
export const blockStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Block style',
  sections: [
    {
      label: 'Outer shell',
      controls: [
        {
          kind: 'range',
          id: BlockStyleControlId.BackgroundOpacity,
          label: 'Background opacity',
          defaultValue: 0.04,
          min: 0,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.BorderWidth,
          label: 'Border width',
          defaultValue: 1,
          min: 0,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        { kind: 'range', id: BlockStyleControlId.Padding, label: 'Padding', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
  ],
});

/** Stable docs contract for the English Block style playground */
export const previewControlContract = {
  controls: blockStyleControls,
  canonicalValues: {
    backgroundOpacity: 0.04,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 8,
  },
  relatedApis: ['Block.background', 'Block.border', 'Block.cornerRadius', 'Block.padding'],
} satisfies PreviewControlContract;
