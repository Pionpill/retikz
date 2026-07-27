import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { monthlyTrend } from './transform-relate.data';

/** 行配对示例的中文控件 */
export const relateControls = definePreviewControls({
  presentation: 'panel',
  title: '端点配对',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '月度趋势',
          rows: monthlyTrend,
          columns: [
            { key: 'series', label: '系列' },
            { key: 'id', label: 'ID' },
            { key: 'month', label: '月份' },
            { key: 'value', label: '数值' },
          ],
        },
      ],
    },
    {
      label: '端点选择',
      controls: [
        {
          kind: 'select',
          id: 'pairingScope',
          label: '配对范围',
          defaultValue: 'series',
          options: [
            { value: 'series', label: '每个系列' },
            { value: 'all', label: '全部数据' },
          ],
        },
        {
          kind: 'select',
          id: 'sourceSelector',
          label: '起点行',
          defaultValue: 'first',
          options: [
            { value: 'first', label: '首行' },
            { value: 'last', label: '末行' },
            { value: 'min', label: '最低值' },
            { value: 'max', label: '最高值' },
          ],
        },
        {
          kind: 'select',
          id: 'targetSelector',
          label: '终点行',
          defaultValue: 'last',
          options: [
            { value: 'first', label: '首行' },
            { value: 'last', label: '末行' },
            { value: 'min', label: '最低值' },
            { value: 'max', label: '最高值' },
          ],
        },
      ],
    },
  ],
});

/** 行配对示例的稳定文档契约 */
export const previewControlContract = {
  controls: relateControls,
  canonicalValues: {
    pairingScope: 'series',
    sourceSelector: 'first',
    targetSelector: 'last',
  },
  presets: [
    {
      id: 'timeline',
      label: '系列首尾',
      values: {
        pairingScope: 'series',
        sourceSelector: 'first',
        targetSelector: 'last',
      },
    },
    {
      id: 'extrema',
      label: '最低到最高',
      values: {
        pairingScope: 'series',
        sourceSelector: 'min',
        targetSelector: 'max',
      },
    },
    {
      id: 'reverse',
      label: '最高到最低',
      values: {
        pairingScope: 'series',
        sourceSelector: 'max',
        targetSelector: 'min',
      },
    },
    {
      id: 'global',
      label: '全局首尾',
      values: {
        pairingScope: 'all',
        sourceSelector: 'first',
        targetSelector: 'last',
      },
    },
  ],
  relatedApis: [
    'IRPlotRelateTransform.groupBy',
    'IRPlotRelateTransform.source',
    'IRPlotRelateTransform.target',
    'IRPlotRelateTransform.measures',
  ],
} satisfies PreviewControlContract;
