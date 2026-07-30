import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { canonicalRows, mixedRows, reportRows } from './value-parsing.data';

/** 值解析示例的中文控件 */
export const valueParsingControls = definePreviewControls({
  presentation: 'panel',
  title: '值解析',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'canonicalRows',
          label: '标准值',
          rows: canonicalRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['canonical'] },
        },
        {
          kind: 'table',
          id: 'mixedRows',
          label: '混合存储',
          rows: mixedRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['mixed'] },
        },
        {
          kind: 'table',
          id: 'reportRows',
          label: '报表格式',
          rows: reportRows,
          visibleWhen: { controlId: 'inputShape', oneOf: ['report'] },
        },
      ],
    },
    {
      label: '规范化',
      controls: [
        {
          kind: 'select',
          id: 'inputShape',
          label: '存储形态',
          defaultValue: 'mixed',
          options: [
            { value: 'canonical', label: '标准 ISO + number' },
            { value: 'mixed', label: '内置转换混合值' },
            { value: 'report', label: 'slashDate + percent' },
          ],
        },
      ],
    },
  ],
});

/** 值解析示例的稳定文档契约 */
export const previewControlContract = {
  controls: valueParsingControls,
  canonicalValues: { inputShape: 'mixed' },
  presets: [
    { id: 'canonical', label: '标准值', values: { inputShape: 'canonical' } },
    { id: 'mixed', label: '内置转换', values: { inputShape: 'mixed' } },
    { id: 'report', label: '声明式格式', values: { inputShape: 'report' } },
  ],
  relatedApis: ['Plot.model', 'IRDataFieldDefinition.format'],
} satisfies PreviewControlContract;
