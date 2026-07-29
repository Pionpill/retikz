import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { monthlyTrend } from './transform-relate.data';

const endpointSelectors = {
  first: { kind: 'first' },
  last: { kind: 'last' },
  min: { kind: 'min', by: 'value' },
  max: { kind: 'max', by: 'value' },
} as const;

/** 根据实时控件值创建端点配对 operation */
export const relateOperationOf = (values: {
  pairingScope: 'series' | 'all';
  sourceSelector: keyof typeof endpointSelectors;
  targetSelector: keyof typeof endpointSelectors;
}) => ({
  kind: 'relate',
  ...(values.pairingScope === 'series' ? { groupBy: ['series'] } : {}),
  source: { selector: endpointSelectors[values.sourceSelector], fields: { id: 'id' } },
  target: { selector: endpointSelectors[values.targetSelector], fields: { id: 'id' } },
  measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel', labelPrefix: '+' }],
});

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
          views: createPlotTransformTableViews(
            { source: '原始', result: '端点配对后' },
            monthlyTrend,
            relateOperationOf,
          ),
          columns: [
            { key: 'series', label: '系列' },
            { key: 'id', label: 'ID' },
            { key: 'month', label: '月份' },
            { key: 'value', label: '数值' },
            { key: 'sourceId', label: '起点 ID' },
            { key: 'targetId', label: '终点 ID' },
            { key: 'delta', label: '差值' },
            { key: 'deltaLabel', label: '差值标签' },
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
