import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

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
export const blockStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '结构块样式',
  sections: [
    {
      label: '整体外框',
      controls: [
        {
          kind: 'range',
          id: BlockStyleControlId.BackgroundOpacity,
          label: '背景透明度',
          defaultValue: 0.04,
          min: 0,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.BorderWidth,
          label: '边框宽度',
          defaultValue: 1,
          min: 0,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        { kind: 'range', id: BlockStyleControlId.Padding, label: '内边距', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: '标题区文字',
      controls: [
        {
          kind: 'color',
          id: BlockStyleControlId.HeaderTitleTextColor,
          label: '标题颜色',
          defaultValue: 'currentColor',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontSize,
          label: '标题字号',
          defaultValue: 'base',
          options: [
            { value: 'xs', label: '极小（xs）' },
            { value: 'sm', label: '小（sm）' },
            { value: 'base', label: '常规（base）' },
            { value: 'lg', label: '大（lg）' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontWeight,
          label: '标题字重',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontStyle,
          label: '标题字形',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.HeaderTitleOpacity,
          label: '标题透明度',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'color',
          id: BlockStyleControlId.HeaderDescriptionTextColor,
          label: '说明颜色',
          defaultValue: 'currentColor',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontSize,
          label: '说明字号',
          defaultValue: 'xs',
          options: [
            { value: 'xs', label: '极小（xs）' },
            { value: 'sm', label: '小（sm）' },
            { value: 'base', label: '常规（base）' },
            { value: 'lg', label: '大（lg）' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontWeight,
          label: '说明字重',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontStyle,
          label: '说明字形',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.HeaderDescriptionOpacity,
          label: '说明透明度',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '行内容',
      controls: [
        {
          kind: 'color',
          id: BlockStyleControlId.RowContentTextColor,
          label: '文字颜色',
          defaultValue: '#64748b',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontSize,
          label: '字号',
          defaultValue: 'sm',
          options: [
            { value: 'xs', label: '极小（xs）' },
            { value: 'sm', label: '小（sm）' },
            { value: 'base', label: '常规（base）' },
            { value: 'lg', label: '大（lg）' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontWeight,
          label: '字重',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'bold', label: '粗体' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontStyle,
          label: '字形',
          defaultValue: 'italic',
          options: [
            { value: 'normal', label: '常规' },
            { value: 'italic', label: '斜体' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.RowContentOpacity,
          label: '透明度',
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
export const previewControlContract = {
  controls: blockStyleControls,
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
