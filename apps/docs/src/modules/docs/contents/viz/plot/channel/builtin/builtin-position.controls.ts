import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { positionRows } from './builtin-position.data';

const positionFieldOptions = [
  { value: 'month', label: '月份' },
  { value: 'sales', label: '销量' },
  { value: 'profit', label: '利润' },
  { value: 'orders', label: '订单量' },
  { value: 'averageOrder', label: '客单价' },
] as const;

/** 内置位置通道试验场的中文控制面板 */
export const builtinPositionControls = definePreviewControls({
  presentation: 'panel',
  title: '位置通道',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '月度经营数据',
          rows: positionRows,
          columns: [
            { key: 'month', label: '月份' },
            { key: 'sales', label: '销量' },
            { key: 'profit', label: '利润' },
            { key: 'orders', label: '订单量' },
            { key: 'averageOrder', label: '客单价' },
          ],
        },
      ],
    },
    {
      label: '位置通道',
      controls: [
        {
          kind: 'select',
          id: 'xField',
          label: 'x 字段（横轴）',
          defaultValue: 'month',
          options: positionFieldOptions,
        },
        {
          kind: 'select',
          id: 'yField',
          label: 'y 字段（纵轴）',
          defaultValue: 'sales',
          options: positionFieldOptions,
        },
      ],
    },
  ],
});

/** 内置位置通道试验场的稳定文档契约 */
export const previewControlContract = {
  controls: builtinPositionControls,
  canonicalValues: {
    xField: 'month',
    yField: 'sales',
  },
  presets: [
    {
      id: 'sales-by-month',
      label: '月度销量',
      values: {
        xField: 'month',
        yField: 'sales',
      },
    },
    {
      id: 'profit-by-month',
      label: '月度利润',
      values: {
        xField: 'month',
        yField: 'profit',
      },
    },
    {
      id: 'sales-by-orders',
      label: '订单量与销量',
      values: {
        xField: 'orders',
        yField: 'sales',
      },
    },
  ],
  relatedApis: ['PointMark.x', 'PointMark.y'],
} satisfies PreviewControlContract;
