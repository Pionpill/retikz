import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { blockBuiltinI18n } from './block-builtin.i18n';

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
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: blockBuiltinI18n[lang].controls[0],
    sections: [
      {
        label: blockBuiltinI18n[lang].controls[1],
        controls: [
          {
            kind: 'switch',
            id: BlockBuiltinControlId.ShowSecondSection,
            label: blockBuiltinI18n[lang].controls[2],
            defaultValue: true,
          },
          {
            kind: 'switch',
            id: BlockBuiltinControlId.ShowExtraRow,
            label: blockBuiltinI18n[lang].controls[3],
            defaultValue: true,
          },
        ],
      },
      {
        label: blockBuiltinI18n[lang].controls[4],
        controls: [
          {
            kind: 'range',
            id: BlockBuiltinControlId.BlockGap,
            label: blockBuiltinI18n[lang].controls[5],
            defaultValue: 8,
            min: 0,
            max: 24,
            step: 2,
          },
        ],
      },
      {
        label: blockBuiltinI18n[lang].controls[6],
        controls: [
          {
            kind: 'select',
            id: BlockBuiltinControlId.HeaderDirection,
            label: blockBuiltinI18n[lang].controls[7],
            defaultValue: 'vertical',
            options: [
              { value: 'vertical', label: blockBuiltinI18n[lang].controls[8] },
              { value: 'horizontal', label: blockBuiltinI18n[lang].controls[9] },
            ],
          },
        ],
      },
      {
        label: blockBuiltinI18n[lang].controls[10],
        controls: [
          {
            kind: 'range',
            id: BlockBuiltinControlId.SectionGap,
            label: blockBuiltinI18n[lang].controls[11],
            defaultValue: 4,
            min: 0,
            max: 24,
            step: 2,
          },
        ],
      },
      {
        label: blockBuiltinI18n[lang].controls[12],
        controls: [
          {
            kind: 'select',
            id: BlockBuiltinControlId.RowItemCount,
            label: blockBuiltinI18n[lang].controls[13],
            defaultValue: '2',
            options: [
              { value: '1', label: blockBuiltinI18n[lang].controls[14] },
              { value: '2', label: blockBuiltinI18n[lang].controls[15] },
              { value: '3', label: blockBuiltinI18n[lang].controls[16] },
            ],
          },
          {
            kind: 'range',
            id: BlockBuiltinControlId.RowGap,
            label: blockBuiltinI18n[lang].controls[17],
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
  return {
    controls,
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
};

export const previewControlContract = createPreviewControlContract();

export const blockBuiltinControls = previewControlContract.controls;
