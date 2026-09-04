import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { measurements } from './transform-histogram.data';

/** 根据实时控件值创建分箱 operation */
export const histogramOperationOf = (values: {
  strategy: 'count' | 'step' | 'thresholds';
  count: number;
  step: number;
  thresholdPreset: 'regular' | 'focused';
}) => {
  const thresholds = values.thresholdPreset === 'focused' ? [3, 5, 7, 10, 14] : [4, 8, 12, 16];
  if (values.strategy === 'count') {
    return { kind: 'bin', field: 'measurement', count: values.count, extent: [0, 20], nice: false } as const;
  }
  if (values.strategy === 'step') {
    return { kind: 'bin', field: 'measurement', step: values.step, extent: [0, 20] } as const;
  }
  return { kind: 'bin', field: 'measurement', thresholds, extent: [0, 20] } as const;
};

/** 分箱示例的中文控件 */
export const histogramControls = definePreviewControls({
  presentation: 'panel',
  title: '直方图分箱',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '连续测量值',
          views: createPlotTransformTableViews(
            { source: '原始', result: '分箱后' },
            measurements,
            histogramOperationOf,
          ),
          columns: [{ key: 'measurement' }, { key: 'binStart' }, { key: 'binEnd' }, { key: 'binCount' }],
        },
      ],
    },
    {
      label: '分箱策略',
      controls: [
        {
          kind: 'select',
          id: 'strategy',
          label: '边界来源',
          defaultValue: 'count',
          options: [
            { value: 'count', label: '目标箱数' },
            { value: 'step', label: '固定箱宽' },
            { value: 'thresholds', label: '显式边界' },
          ],
        },
        {
          kind: 'range',
          id: 'count',
          label: '箱数',
          defaultValue: 8,
          min: 4,
          max: 12,
          step: 1,
          visibleWhen: { controlId: 'strategy', oneOf: ['count'] },
        },
        {
          kind: 'range',
          id: 'step',
          label: '箱宽',
          defaultValue: 4,
          min: 2,
          max: 6,
          step: 1,
          visibleWhen: { controlId: 'strategy', oneOf: ['step'] },
        },
        {
          kind: 'select',
          id: 'thresholdPreset',
          label: '边界组',
          defaultValue: 'regular',
          options: [
            { value: 'regular', label: '等距边界' },
            { value: 'focused', label: '低值加密' },
          ],
          visibleWhen: { controlId: 'strategy', oneOf: ['thresholds'] },
        },
      ],
    },
  ],
});

/** 分箱示例的稳定文档契约 */
export const previewControlContract = {
  controls: histogramControls,
  canonicalValues: { strategy: 'count', count: 8, step: 4, thresholdPreset: 'regular' },
  presets: [
    { id: 'count', label: '8 个箱', values: { strategy: 'count', count: 8, step: 4, thresholdPreset: 'regular' } },
    { id: 'step', label: '箱宽 4', values: { strategy: 'step', count: 8, step: 4, thresholdPreset: 'regular' } },
    {
      id: 'thresholds',
      label: '显式边界',
      values: { strategy: 'thresholds', count: 8, step: 4, thresholdPreset: 'focused' },
    },
  ],
  relatedApis: ['IRPlotBinTransform.count', 'IRPlotBinTransform.step', 'IRPlotBinTransform.thresholds'],
} satisfies PreviewControlContract;
