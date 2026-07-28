import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { currentSales, financeFeed, forecastSales } from './source-binding.data';

/** 数据源绑定示例的中文控件 */
export const sourceBindingControls = definePreviewControls({
  presentation: 'panel',
  title: '数据源绑定',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'currentRows',
          label: '当前数据',
          rows: currentSales,
          visibleWhen: { controlId: 'source', oneOf: ['current'] },
        },
        {
          kind: 'table',
          id: 'forecastRows',
          label: '预测数据',
          rows: forecastSales,
          visibleWhen: { controlId: 'source', oneOf: ['forecast'] },
        },
        {
          kind: 'table',
          id: 'financeRows',
          label: '财务数据',
          rows: financeFeed,
          visibleWhen: { controlId: 'source', oneOf: ['finance'] },
        },
      ],
    },
    {
      label: '接入方式',
      controls: [
        {
          kind: 'select',
          id: 'source',
          label: '数据源',
          defaultValue: 'current',
          options: [
            { value: 'current', label: '当前销售 · 同名字段' },
            { value: 'forecast', label: '预测销售 · 同名字段' },
            { value: 'finance', label: '财务数据 · fieldMap' },
          ],
        },
      ],
    },
  ],
});

/** 数据源绑定示例的稳定文档契约 */
export const previewControlContract = {
  controls: sourceBindingControls,
  canonicalValues: { source: 'current' },
  relatedApis: ['Plot.data', 'Plot.model', 'Plot.fieldMap'],
} satisfies PreviewControlContract;
