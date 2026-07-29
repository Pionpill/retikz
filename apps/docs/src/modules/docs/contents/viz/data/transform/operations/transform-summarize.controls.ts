import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { orders } from './transform-summarize.data';
import { transformSummarizeOperationOf } from './transform-summarize-preview';

/** 分组汇总示例的中文控件 */
export const transformSummarizeControls = definePreviewControls({
  presentation: 'panel',
  title: '分组汇总',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '订单明细',
          views: createTransformTableViews({ source: '原始', result: '变换' }, orders, transformSummarizeOperationOf),
        },
      ],
    },
    {
      label: '统计规约',
      controls: [
        {
          kind: 'select',
          id: 'reducerKind',
          label: '统计量',
          defaultValue: 'sum',
          options: [
            { value: 'sum', label: '总和' },
            { value: 'mean', label: '平均值' },
            { value: 'median', label: '中位数' },
            { value: 'min', label: '最小值' },
            { value: 'max', label: '最大值' },
            { value: 'count', label: '行数' },
          ],
        },
      ],
    },
  ],
});

/** 分组汇总示例的稳定文档契约 */
export const previewControlContract = {
  controls: transformSummarizeControls,
  canonicalValues: { reducerKind: 'sum' },
  presets: [
    { id: 'sum', label: '总收入', values: { reducerKind: 'sum' } },
    { id: 'mean', label: '平均单笔', values: { reducerKind: 'mean' } },
    { id: 'count', label: '订单数', values: { reducerKind: 'count' } },
  ],
  relatedApis: ['IRDataSummarizeTransform.groupBy', 'IRDataSummarizeTransform.metrics'],
} satisfies PreviewControlContract;
