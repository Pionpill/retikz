import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Block 基础用法 playground 使用的稳定字段 id */
export const BlockBasicControlId = {
  ShowIcon: 'showIcon',
  ShowTrailing: 'showTrailing',
  HeaderDirection: 'headerDirection',
  HeaderItemGap: 'headerItemGap',
  HeaderJustifyContent: 'headerJustifyContent',
  ShowExtraField: 'showExtraField',
  FieldName: 'fieldName',
  FieldType: 'fieldType',
} as const;

/** Block 基础结构的中文控制 */
export const blockBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Block 基础结构',
  sections: [
    {
      label: 'Header',
      controls: [
        { kind: 'switch', id: BlockBasicControlId.ShowIcon, label: '显示图标', defaultValue: true },
        { kind: 'switch', id: BlockBasicControlId.ShowTrailing, label: '显示尾部内容', defaultValue: true },
        {
          kind: 'select',
          id: BlockBasicControlId.HeaderDirection,
          label: '标题排列',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
        {
          kind: 'range',
          id: BlockBasicControlId.HeaderItemGap,
          label: '标题间距',
          defaultValue: 4,
          min: 0,
          max: 24,
          step: 2,
          visibleWhen: { controlId: BlockBasicControlId.HeaderDirection, oneOf: ['horizontal'] },
        },
        {
          kind: 'select',
          id: BlockBasicControlId.HeaderJustifyContent,
          label: '标题分布',
          defaultValue: 'start',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'space-between', label: '两端对齐' },
            { value: 'space-around', label: '环绕间距' },
            { value: 'space-evenly', label: '均匀间距' },
          ],
          visibleWhen: { controlId: BlockBasicControlId.HeaderDirection, oneOf: ['horizontal'] },
        },
      ],
    },
    {
      label: '字段',
      controls: [
        { kind: 'switch', id: BlockBasicControlId.ShowExtraField, label: '添加字段', defaultValue: true },
        {
          kind: 'text',
          id: BlockBasicControlId.FieldName,
          label: '字段名',
          defaultValue: 'email',
          visibleWhen: { controlId: BlockBasicControlId.ShowExtraField, oneOf: [true] },
        },
        {
          kind: 'text',
          id: BlockBasicControlId.FieldType,
          label: '字段类型',
          defaultValue: 'string?',
          visibleWhen: { controlId: BlockBasicControlId.ShowExtraField, oneOf: [true] },
        },
      ],
    },
  ],
});

/** Block 基础用法 playground 的稳定文档契约 */
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
