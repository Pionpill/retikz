import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BlockBuiltinControlId } from './block-builtin.controls';

/** English controls for the built-in Block components */
export const blockBuiltinControls = definePreviewControls({
  presentation: 'panel',
  title: 'Built-in Block components',
  sections: [
    {
      label: 'Structure',
      controls: [
        {
          kind: 'switch',
          id: BlockBuiltinControlId.ShowSecondSection,
          label: 'Add second Section',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: BlockBuiltinControlId.ShowExtraRow,
          label: 'Add Row',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Block layout',
      controls: [
        {
          kind: 'range',
          id: BlockBuiltinControlId.BlockGap,
          label: 'Children gap',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: 'Header layout',
      controls: [
        {
          kind: 'select',
          id: BlockBuiltinControlId.HeaderDirection,
          label: 'Direction',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
      ],
    },
    {
      label: 'Section layout',
      controls: [
        {
          kind: 'range',
          id: BlockBuiltinControlId.SectionGap,
          label: 'Item gap',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: 'Row layout',
      controls: [
        {
          kind: 'select',
          id: BlockBuiltinControlId.RowItemCount,
          label: 'Content items',
          defaultValue: '2',
          options: [
            { value: '1', label: '1 item (full width)' },
            { value: '2', label: '2 items (1:1)' },
            { value: '3', label: '3 items (1:1:1)' },
          ],
        },
        {
          kind: 'range',
          id: BlockBuiltinControlId.RowGap,
          label: 'Content gap',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
  ],
});

/** Stable docs contract for the English built-in Block playground */
export const previewControlContract = {
  controls: blockBuiltinControls,
  canonicalValues: {
    showSecondSection: true,
    showExtraRow: true,
    blockGap: 8,
    headerDirection: 'vertical',
    sectionGap: 4,
    rowItemCount: '2',
    rowGap: 8,
  } as const,
  relatedApis: [
    'Block.children',
    'Block.gap',
    'BlockHeader.title',
    'BlockHeader.direction',
    'BlockSection.children',
    'BlockSection.gap',
    'BlockRow.content',
    'BlockRow.gap',
  ],
} satisfies PreviewControlContract;
