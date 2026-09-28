import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { blockStyleI18n } from './block-style.i18n';

/** Block 样式 playground 使用的稳定字段 id */
export const BlockStyleControlId = {
  BackgroundOpacity: 'backgroundOpacity',
  BorderWidth: 'borderWidth',
  CornerRadius: 'cornerRadius',
  Padding: 'padding',
  HeaderTitleTextColor: 'headerTitleTextColor',
  HeaderTitleFontSize: 'headerTitleFontSize',
  HeaderTitleFontWeight: 'headerTitleFontWeight',
  HeaderTitleFontStyle: 'headerTitleFontStyle',
  HeaderTitleOpacity: 'headerTitleOpacity',
  HeaderDescriptionTextColor: 'headerDescriptionTextColor',
  HeaderDescriptionFontSize: 'headerDescriptionFontSize',
  HeaderDescriptionFontWeight: 'headerDescriptionFontWeight',
  HeaderDescriptionFontStyle: 'headerDescriptionFontStyle',
  HeaderDescriptionOpacity: 'headerDescriptionOpacity',
  RowContentTextColor: 'rowContentTextColor',
  RowContentFontSize: 'rowContentFontSize',
  RowContentFontWeight: 'rowContentFontWeight',
  RowContentFontStyle: 'rowContentFontStyle',
  RowContentOpacity: 'rowContentOpacity',
} as const;

/** Block shell 的中文样式控制 */
export const createPreviewControlContract = (lang: Lang = 'zh') => {
  const controls = definePreviewControls({
    presentation: 'panel',
    defaultSize: 50,
    title: blockStyleI18n[lang].controls[0],
    sections: [
      {
        label: blockStyleI18n[lang].controls[1],
        controls: [
          {
            kind: 'range',
            id: BlockStyleControlId.BackgroundOpacity,
            label: blockStyleI18n[lang].controls[2],
            defaultValue: 0.04,
            min: 0,
            max: 1,
            step: 0.02,
          },
          {
            kind: 'range',
            id: BlockStyleControlId.BorderWidth,
            label: blockStyleI18n[lang].controls[3],
            defaultValue: 1,
            min: 0,
            max: 4,
            step: 0.5,
          },
          {
            kind: 'range',
            id: BlockStyleControlId.CornerRadius,
            label: blockStyleI18n[lang].controls[4],
            defaultValue: 8,
            min: 0,
            max: 24,
            step: 2,
          },
          {
            kind: 'range',
            id: BlockStyleControlId.Padding,
            label: blockStyleI18n[lang].controls[5],
            defaultValue: 8,
            min: 0,
            max: 24,
            step: 2,
          },
        ],
      },
      {
        label: blockStyleI18n[lang].controls[6],
        controls: [
          {
            kind: 'color',
            id: BlockStyleControlId.HeaderTitleTextColor,
            label: blockStyleI18n[lang].controls[7],
            defaultValue: 'currentColor',
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderTitleFontSize,
            label: blockStyleI18n[lang].controls[8],
            defaultValue: 'base',
            options: [
              { value: 'xs', label: blockStyleI18n[lang].controls[9] },
              { value: 'sm', label: blockStyleI18n[lang].controls[10] },
              { value: 'base', label: blockStyleI18n[lang].controls[11] },
              { value: 'lg', label: blockStyleI18n[lang].controls[12] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderTitleFontWeight,
            label: blockStyleI18n[lang].controls[13],
            defaultValue: 'bold',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[14] },
              { value: 'bold', label: blockStyleI18n[lang].controls[15] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderTitleFontStyle,
            label: blockStyleI18n[lang].controls[16],
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[17] },
              { value: 'italic', label: blockStyleI18n[lang].controls[18] },
            ],
          },
          {
            kind: 'range',
            id: BlockStyleControlId.HeaderTitleOpacity,
            label: blockStyleI18n[lang].controls[19],
            defaultValue: 1,
            min: 0,
            max: 1,
            step: 0.05,
          },
          {
            kind: 'color',
            id: BlockStyleControlId.HeaderDescriptionTextColor,
            label: blockStyleI18n[lang].controls[20],
            defaultValue: 'currentColor',
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderDescriptionFontSize,
            label: blockStyleI18n[lang].controls[21],
            defaultValue: 'xs',
            options: [
              { value: 'xs', label: blockStyleI18n[lang].controls[22] },
              { value: 'sm', label: blockStyleI18n[lang].controls[23] },
              { value: 'base', label: blockStyleI18n[lang].controls[24] },
              { value: 'lg', label: blockStyleI18n[lang].controls[25] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderDescriptionFontWeight,
            label: blockStyleI18n[lang].controls[26],
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[27] },
              { value: 'bold', label: blockStyleI18n[lang].controls[28] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.HeaderDescriptionFontStyle,
            label: blockStyleI18n[lang].controls[29],
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[30] },
              { value: 'italic', label: blockStyleI18n[lang].controls[31] },
            ],
          },
          {
            kind: 'range',
            id: BlockStyleControlId.HeaderDescriptionOpacity,
            label: blockStyleI18n[lang].controls[32],
            defaultValue: 0.7,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
      {
        label: blockStyleI18n[lang].controls[33],
        controls: [
          {
            kind: 'color',
            id: BlockStyleControlId.RowContentTextColor,
            label: blockStyleI18n[lang].controls[34],
            defaultValue: '#64748b',
          },
          {
            kind: 'select',
            id: BlockStyleControlId.RowContentFontSize,
            label: blockStyleI18n[lang].controls[35],
            defaultValue: 'sm',
            options: [
              { value: 'xs', label: blockStyleI18n[lang].controls[36] },
              { value: 'sm', label: blockStyleI18n[lang].controls[37] },
              { value: 'base', label: blockStyleI18n[lang].controls[38] },
              { value: 'lg', label: blockStyleI18n[lang].controls[39] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.RowContentFontWeight,
            label: blockStyleI18n[lang].controls[40],
            defaultValue: 'normal',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[41] },
              { value: 'bold', label: blockStyleI18n[lang].controls[42] },
            ],
          },
          {
            kind: 'select',
            id: BlockStyleControlId.RowContentFontStyle,
            label: blockStyleI18n[lang].controls[43],
            defaultValue: 'italic',
            options: [
              { value: 'normal', label: blockStyleI18n[lang].controls[44] },
              { value: 'italic', label: blockStyleI18n[lang].controls[45] },
            ],
          },
          {
            kind: 'range',
            id: BlockStyleControlId.RowContentOpacity,
            label: blockStyleI18n[lang].controls[46],
            defaultValue: 0.8,
            min: 0,
            max: 1,
            step: 0.05,
          },
        ],
      },
    ],
  });

  /** Block 样式 playground 的稳定文档契约 */
  return {
    controls,
    canonicalValues: {
      backgroundOpacity: 0.04,
      borderWidth: 1,
      cornerRadius: 8,
      padding: 8,
      headerTitleTextColor: 'currentColor',
      headerTitleFontSize: 'base',
      headerTitleFontWeight: 'bold',
      headerTitleFontStyle: 'normal',
      headerTitleOpacity: 1,
      headerDescriptionTextColor: 'currentColor',
      headerDescriptionFontSize: 'xs',
      headerDescriptionFontWeight: 'normal',
      headerDescriptionFontStyle: 'normal',
      headerDescriptionOpacity: 0.7,
      rowContentTextColor: '#64748b',
      rowContentFontSize: 'sm',
      rowContentFontWeight: 'normal',
      rowContentFontStyle: 'italic',
      rowContentOpacity: 0.8,
    } as const,
    relatedApis: [
      'Block.background',
      'Block.border',
      'Block.cornerRadius',
      'Block.padding',
      'BlockHeader.title',
      'BlockHeader.description',
      'BlockRow.content',
      'IRBlockText.textColor',
      'IRBlockText.font',
      'IRBlockText.opacity',
    ],
  } satisfies PreviewControlContract;
};
export const previewControlContract = createPreviewControlContract();
export const blockStyleControls = previewControlContract.controls;
