import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { trendSamples } from './transform-smooth.data';

/** 根据实时控件值创建趋势采样流水线 */
export const smoothOperationsOf = (values: { sampleCount: number; extentMode: 'observed' | 'extend' }) => {
  const extent: [number, number] | undefined = values.extentMode === 'extend' ? [-1, 5] : undefined;
  return [
    {
      kind: 'smooth',
      x: 'time',
      y: 'value',
      groupBy: ['series'],
      method: { kind: 'linear' },
      sampleCount: values.sampleCount,
      ...(extent !== undefined ? { extent } : {}),
      xAs: 'trendX',
      yAs: 'trendY',
    },
  ];
};

/** 趋势示例的中文控件 */
export const smoothControls = definePreviewControls({
  presentation: 'panel',
  title: '线性趋势',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分组时序样本',
          views: createPlotTransformTableViews(
            { source: '原始', result: '趋势采样后' },
            trendSamples,
            smoothOperationsOf,
          ),
          columns: [{ key: 'series' }, { key: 'time' }, { key: 'value' }, { key: 'trendX' }, { key: 'trendY' }],
        },
      ],
    },
    {
      label: '趋势采样',
      controls: [
        {
          kind: 'range',
          id: 'sampleCount',
          label: '预测点数',
          defaultValue: 32,
          min: 8,
          max: 80,
          step: 8,
        },
        {
          kind: 'select',
          id: 'extentMode',
          label: '采样范围',
          defaultValue: 'observed',
          options: [
            { value: 'observed', label: '观测范围' },
            { value: 'extend', label: '向两侧外推' },
          ],
        },
      ],
    },
  ],
});

/** 趋势示例的稳定文档契约 */
export const previewControlContract = {
  controls: smoothControls,
  canonicalValues: { sampleCount: 32, extentMode: 'observed' },
  presets: [
    { id: 'observed', label: '观测范围', values: { sampleCount: 32, extentMode: 'observed' } },
    { id: 'extend', label: '外推趋势', values: { sampleCount: 48, extentMode: 'extend' } },
  ],
  relatedApis: ['IRPlotSmoothTransform.sampleCount', 'IRPlotSmoothTransform.extent'],
} satisfies PreviewControlContract;
