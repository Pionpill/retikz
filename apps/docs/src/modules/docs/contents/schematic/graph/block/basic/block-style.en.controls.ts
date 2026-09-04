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
    {
      label: 'Header text',
      controls: [
        {
          kind: 'color',
          id: BlockStyleControlId.HeaderTitleTextColor,
          label: 'Title color',
          defaultValue: 'currentColor',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontSize,
          label: 'Title size',
          defaultValue: 'base',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
            { value: 'lg', label: 'lg' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontWeight,
          label: 'Title weight',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderTitleFontStyle,
          label: 'Title style',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.HeaderTitleOpacity,
          label: 'Title opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'color',
          id: BlockStyleControlId.HeaderDescriptionTextColor,
          label: 'Description color',
          defaultValue: 'currentColor',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontSize,
          label: 'Description size',
          defaultValue: 'xs',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
            { value: 'lg', label: 'lg' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontWeight,
          label: 'Description weight',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.HeaderDescriptionFontStyle,
          label: 'Description style',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.HeaderDescriptionOpacity,
          label: 'Description opacity',
          defaultValue: 0.7,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Row content',
      controls: [
        {
          kind: 'color',
          id: BlockStyleControlId.RowContentTextColor,
          label: 'Text color',
          defaultValue: '#64748b',
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontSize,
          label: 'Size',
          defaultValue: 'sm',
          options: [
            { value: 'xs', label: 'xs' },
            { value: 'sm', label: 'sm' },
            { value: 'base', label: 'base' },
            { value: 'lg', label: 'lg' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontWeight,
          label: 'Weight',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: BlockStyleControlId.RowContentFontStyle,
          label: 'Style',
          defaultValue: 'italic',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
        {
          kind: 'range',
          id: BlockStyleControlId.RowContentOpacity,
          label: 'Opacity',
          defaultValue: 0.8,
          min: 0,
          max: 1,
          step: 0.05,
        },
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
