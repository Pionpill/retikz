import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { revenue } from './transform-normalize.data';

/** 根据实时控件值创建归一化与堆叠流水线 */
export const normalizeOperationsOf = (values: { basis: 'fraction' | 'percent'; grouping: 'quarter' | 'global' }) => [
  {
    kind: 'normalize',
    field: 'amount',
    ...(values.grouping === 'quarter' ? { groupBy: ['quarter'] } : {}),
    basis: values.basis,
    as: 'share',
  },
  { kind: 'stack', x: 'quarter', y: 'share', groupBy: 'product' },
];

/** 归一化示例的中文控件 */
export const normalizeControls = definePreviewControls({
  presentation: 'panel',
  title: '组内占比',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '季度产品销量',
          views: createPlotTransformTableViews(
            { source: '原始', result: '归一化与堆叠后' },
            revenue,
            normalizeOperationsOf,
          ),
          columns: [
            { key: 'quarter' },
            { key: 'product' },
            { key: 'amount' },
            { key: 'share' },
            { key: 'y0' },
            { key: 'y1' },
          ],
        },
      ],
    },
    {
      label: '归一化方式',
      controls: [
        {
          kind: 'select',
          id: 'basis',
          label: '输出基准',
          defaultValue: 'percent',
          options: [
            { value: 'fraction', label: '比例 0–1' },
            { value: 'percent', label: '百分比 0–100' },
          ],
        },
        {
          kind: 'select',
          id: 'grouping',
          label: '分组范围',
          defaultValue: 'quarter',
          options: [
            { value: 'quarter', label: '每个季度' },
            { value: 'global', label: '全部数据' },
          ],
        },
      ],
    },
  ],
});

/** 归一化示例的稳定文档契约 */
export const previewControlContract = {
  controls: normalizeControls,
  canonicalValues: { basis: 'percent', grouping: 'quarter' },
  presets: [
    { id: 'quarter-percent', label: '季度百分比', values: { basis: 'percent', grouping: 'quarter' } },
    { id: 'global-fraction', label: '全局比例', values: { basis: 'fraction', grouping: 'global' } },
  ],
  relatedApis: ['IRPlotNormalizeTransform.basis', 'IRPlotNormalizeTransform.groupBy'],
} satisfies PreviewControlContract;
