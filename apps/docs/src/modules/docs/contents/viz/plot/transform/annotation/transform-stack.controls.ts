import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { productRevenue } from './transform-stack.data';

/** 根据实时控件值创建堆叠 operation */
export const stackOperationOf = (values: { offset: 'zero' | 'normalize' | 'center' | 'overlap' }) => ({
  kind: 'stack',
  x: 'quarter',
  y: 'revenue',
  groupBy: 'product',
  offset: values.offset,
});

/** 堆叠示例的中文控件 */
export const stackControls = definePreviewControls({
  presentation: 'panel',
  title: '堆叠区间',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '季度产品收入',
          views: createPlotTransformTableViews({ source: '原始', result: '堆叠后' }, productRevenue, stackOperationOf),
          columns: [
            { key: 'quarter', label: '季度' },
            { key: 'product', label: '产品' },
            { key: 'revenue', label: '收入' },
            { key: 'y0', label: '下界 y0' },
            { key: 'y1', label: '上界 y1' },
          ],
        },
      ],
    },
    {
      label: '堆叠方式',
      controls: [
        {
          kind: 'select',
          id: 'offset',
          label: '基线策略',
          defaultValue: 'zero',
          options: [
            { value: 'zero', label: '从零累加' },
            { value: 'normalize', label: '归一到 0–1' },
            { value: 'center', label: '整体居中' },
            { value: 'overlap', label: '从零重叠' },
          ],
        },
      ],
    },
  ],
});

/** 堆叠示例的稳定文档契约 */
export const previewControlContract = {
  controls: stackControls,
  canonicalValues: { offset: 'zero' },
  presets: [
    { id: 'zero', label: '普通堆叠', values: { offset: 'zero' } },
    { id: 'normalize', label: '归一堆叠', values: { offset: 'normalize' } },
    { id: 'center', label: '居中堆叠', values: { offset: 'center' } },
  ],
  relatedApis: ['IRPlotStackTransform.offset'],
} satisfies PreviewControlContract;
