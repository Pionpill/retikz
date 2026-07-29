import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { storeRevenue } from './transform-annotate.data';
import { transformAnnotateOperationOf } from './transform-annotate-preview';

/** 统计标注示例的中文控件 */
export const transformAnnotateControls = definePreviewControls({
  presentation: 'panel',
  title: '统计标注',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '门店收入',
          views: createTransformTableViews(
            { source: '原始', result: '变换' },
            storeRevenue,
            transformAnnotateOperationOf,
          ),
        },
      ],
    },
    {
      label: '广播统计量',
      controls: [
        {
          kind: 'select',
          id: 'reducerKind',
          label: '统计量',
          defaultValue: 'mean',
          options: [
            { value: 'mean', label: '平均值' },
            { value: 'median', label: '中位数' },
            { value: 'min', label: '最小值' },
            { value: 'max', label: '最大值' },
          ],
        },
      ],
    },
  ],
});

/** 统计标注示例的稳定文档契约 */
export const previewControlContract = {
  controls: transformAnnotateControls,
  canonicalValues: { reducerKind: 'mean' },
  presets: [
    { id: 'mean', label: '组平均值', values: { reducerKind: 'mean' } },
    { id: 'median', label: '组中位数', values: { reducerKind: 'median' } },
    { id: 'max', label: '组最大值', values: { reducerKind: 'max' } },
  ],
  relatedApis: ['IRDataAnnotateTransform.groupBy', 'IRDataAnnotateTransform.metrics'],
} satisfies PreviewControlContract;
