import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { blockCustomCanonicalValues, BlockCustomControlId, BlockCustomVisibleWhen } from './block-custom.controls';

/** English controls for custom Block elements */
export const blockCustomControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom elements',
  sections: [
    {
      label: 'Custom Node',
      controls: [
        {
          kind: 'text',
          id: BlockCustomControlId.Content,
          label: 'Node content',
          defaultValue: blockCustomCanonicalValues.content,
          placeholder: 'Enter custom Node content',
        },
        {
          kind: 'select',
          id: BlockCustomControlId.FontSize,
          label: 'Font size',
          defaultValue: blockCustomCanonicalValues.fontSize,
          options: [
            { value: 'xs', label: 'XS' },
            { value: 'sm', label: 'SM' },
            { value: 'base', label: 'Base' },
            { value: 'lg', label: 'LG' },
          ],
        },
      ],
    },
    {
      label: 'Shape and size',
      controls: [
        {
          kind: 'select',
          id: BlockCustomControlId.Shape,
          label: 'Shape',
          defaultValue: blockCustomCanonicalValues.shape,
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'diamond', label: 'Diamond' },
          ],
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Padding,
          label: 'Padding',
          defaultValue: blockCustomCanonicalValues.padding,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.MinimumWidth,
          label: 'Minimum width',
          defaultValue: blockCustomCanonicalValues.minimumWidth,
          min: 80,
          max: 224,
          step: 8,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.MinimumHeight,
          label: 'Minimum height',
          defaultValue: blockCustomCanonicalValues.minimumHeight,
          min: 24,
          max: 96,
          step: 8,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Rotate,
          label: 'Rotate',
          defaultValue: blockCustomCanonicalValues.rotate,
          min: -45,
          max: 45,
          step: 5,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: blockCustomCanonicalValues.cornerRadius,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: BlockCustomVisibleWhen.CornerRadius,
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'color',
          id: BlockCustomControlId.Fill,
          label: 'Fill',
          defaultValue: blockCustomCanonicalValues.fill,
        },
        {
          kind: 'color',
          id: BlockCustomControlId.Stroke,
          label: 'Stroke',
          defaultValue: blockCustomCanonicalValues.stroke,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: blockCustomCanonicalValues.strokeWidth,
          min: 0,
          max: 6,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: BlockCustomControlId.Dashed,
          label: 'Dashed',
          defaultValue: blockCustomCanonicalValues.dashed,
        },
        {
          kind: 'range',
          id: BlockCustomControlId.Opacity,
          label: 'Overall opacity',
          defaultValue: blockCustomCanonicalValues.opacity,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'select',
          id: BlockCustomControlId.Shadow,
          label: 'Shadow',
          defaultValue: blockCustomCanonicalValues.shadow,
          options: [
            { value: 'none', label: 'None' },
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
          ],
        },
        {
          kind: 'color',
          id: BlockCustomControlId.TextColor,
          label: 'Text color',
          defaultValue: blockCustomCanonicalValues.textColor,
        },
      ],
    },
  ],
});

/** Stable docs contract for the English custom Block playground */
export const previewControlContract = {
  controls: blockCustomControls,
  canonicalValues: blockCustomCanonicalValues,
  relatedApis: [
    'Block.children',
    'Node.children',
    'Node.font',
    'Node.shape',
    'Node.padding',
    'Node.minimumSize',
    'Node.rotate',
    'Node.cornerRadius',
    'Node.fill',
    'Node.stroke',
    'Node.strokeWidth',
    'Node.dashed',
    'Node.opacity',
    'Node.shadow',
    'Node.textColor',
  ],
} satisfies PreviewControlContract;
