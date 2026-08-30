import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BlockBasicControlId } from './block-basic.controls';

/** English controls for the basic Block structure */
export const blockBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Basic Block structure',
  sections: [
    {
      label: 'Header',
      controls: [
        { kind: 'switch', id: BlockBasicControlId.ShowIcon, label: 'Show icon', defaultValue: true },
        { kind: 'switch', id: BlockBasicControlId.ShowTrailing, label: 'Show trailing content', defaultValue: true },
        {
          kind: 'select',
          id: BlockBasicControlId.HeaderDirection,
          label: 'Title layout',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
        {
          kind: 'range',
          id: BlockBasicControlId.HeaderItemGap,
          label: 'Title gap',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: BlockBasicControlId.HeaderDirection, oneOf: ['horizontal'] },
        },
        {
          kind: 'select',
          id: BlockBasicControlId.HeaderJustifyContent,
          label: 'Title distribution',
          defaultValue: 'start',
          options: [
            { value: 'start', label: 'Start' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'End' },
            { value: 'space-between', label: 'Space between' },
            { value: 'space-around', label: 'Space around' },
            { value: 'space-evenly', label: 'Space evenly' },
          ],
          visibleWhen: { controlId: BlockBasicControlId.HeaderDirection, oneOf: ['horizontal'] },
        },
      ],
    },
    {
      label: 'Fields',
      controls: [
        { kind: 'switch', id: BlockBasicControlId.ShowExtraField, label: 'Add field', defaultValue: true },
        {
          kind: 'text',
          id: BlockBasicControlId.FieldName,
          label: 'Field name',
          defaultValue: 'email',
          visibleWhen: { controlId: BlockBasicControlId.ShowExtraField, oneOf: [true] },
        },
        {
          kind: 'text',
          id: BlockBasicControlId.FieldType,
          label: 'Field type',
          defaultValue: 'string?',
          visibleWhen: { controlId: BlockBasicControlId.ShowExtraField, oneOf: [true] },
        },
      ],
    },
  ],
});

/** Stable docs contract for the English basic Block playground */
export const previewControlContract = {
  controls: blockBasicControls,
  canonicalValues: {
    showIcon: true,
    showTrailing: true,
    headerDirection: 'vertical',
    headerItemGap: 4,
    headerJustifyContent: 'start',
    showExtraField: true,
    fieldName: 'email',
    fieldType: 'string?',
  },
  relatedApis: [
    'BlockHeader.icon',
    'BlockHeader.trailing',
    'BlockHeader.direction',
    'BlockHeader.itemGap',
    'BlockHeader.justifyContent',
    'BlockRow.children',
    'BlockCell.child',
  ],
} satisfies PreviewControlContract;
