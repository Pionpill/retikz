import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Block 内置组件 playground 使用的稳定字段 id */
export const BlockBuiltinControlId = {
  ShowSecondSection: 'showSecondSection',
  ShowExtraRow: 'showExtraRow',
  BlockGap: 'blockGap',
  HeaderDirection: 'headerDirection',
  SectionGap: 'sectionGap',
  RowItemCount: 'rowItemCount',
  RowGap: 'rowGap',
} as const;

/** Block 内置组件的中文控制 */
export const blockBuiltinControls = definePreviewControls({
  presentation: 'panel',
  title: 'Block 内置组件',
  sections: [
    {
      label: '结构',
      controls: [
        {
          kind: 'switch',
          id: BlockBuiltinControlId.ShowSecondSection,
          label: '添加第二个 Section',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: BlockBuiltinControlId.ShowExtraRow,
          label: '添加一行',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Block 布局',
      controls: [
        {
          kind: 'range',
          id: BlockBuiltinControlId.BlockGap,
          label: '整体间距',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: 'Header 布局',
      controls: [
        {
          kind: 'select',
          id: BlockBuiltinControlId.HeaderDirection,
          label: '排列方向',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
      ],
    },
    {
      label: 'Section 布局',
      controls: [
        {
          kind: 'range',
          id: BlockBuiltinControlId.SectionGap,
          label: '内部间距',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: 'Row 布局',
      controls: [
        {
          kind: 'select',
          id: BlockBuiltinControlId.RowItemCount,
          label: '内容项数',
          defaultValue: '2',
          options: [
            { value: '1', label: '1 项（占满）' },
            { value: '2', label: '2 项（1:1）' },
            { value: '3', label: '3 项（1:1:1）' },
          ],
        },
        {
          kind: 'range',
          id: BlockBuiltinControlId.RowGap,
          label: '内容间距',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
      ],
    },
  ],
});

/** Block 内置组件 playground 的稳定文档契约 */
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
