import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { monthlyRevenue } from './transform-sort.data';
import { transformSortOperationOf } from './transform-sort-preview';

/** 行排序示例的中文控件 */
export const transformSortControls = definePreviewControls({
  presentation: 'panel',
  title: '行排序',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '月度收入',
          views: createTransformTableViews(
            { source: '原始', result: '变换' },
            monthlyRevenue,
            transformSortOperationOf,
          ),
        },
      ],
    },
    {
      label: '排序操作',
      controls: [
        {
          kind: 'select',
          id: 'field',
          label: '排序字段',
          defaultValue: 'month',
          options: [
            { value: 'month', label: '月份' },
            { value: 'revenue', label: '收入' },
          ],
        },
        {
          kind: 'select',
          id: 'order',
          label: '方向',
          defaultValue: 'ascending',
          options: [
            { value: 'ascending', label: '升序' },
            { value: 'descending', label: '降序' },
          ],
        },
      ],
    },
  ],
});

/** 行排序示例的稳定文档契约 */
export const previewControlContract = {
  controls: transformSortControls,
  canonicalValues: { field: 'month', order: 'ascending' },
  presets: [
    { id: 'month-ascending', label: '月份正序', values: { field: 'month', order: 'ascending' } },
    { id: 'month-descending', label: '月份倒序', values: { field: 'month', order: 'descending' } },
    { id: 'revenue-descending', label: '收入从高到低', values: { field: 'revenue', order: 'descending' } },
  ],
  relatedApis: ['IRDataSortTransform.field', 'IRDataSortTransform.order'],
} satisfies PreviewControlContract;
