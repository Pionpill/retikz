import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { histogramOperationOf } from './transform-histogram.controls';
import { measurements } from './transform-histogram.data';

/** 分箱示例的英文控件 */
export const histogramControls = definePreviewControls({
  presentation: 'panel',
  title: 'Histogram bins',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Continuous measurements',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Binned' },
            measurements,
            histogramOperationOf,
          ),
          columns: [{ key: 'measurement' }, { key: 'binStart' }, { key: 'binEnd' }, { key: 'binCount' }],
        },
      ],
    },
    {
      label: 'Binning strategy',
      controls: [
        {
          kind: 'select',
          id: 'strategy',
          label: 'Edge source',
          defaultValue: 'count',
          options: [
            { value: 'count', label: 'Target bin count' },
            { value: 'step', label: 'Fixed bin width' },
            { value: 'thresholds', label: 'Explicit thresholds' },
          ],
        },
        {
          kind: 'range',
          id: 'count',
          label: 'Bin count',
          defaultValue: 8,
          min: 4,
          max: 12,
          step: 1,
          visibleWhen: { controlId: 'strategy', oneOf: ['count'] },
        },
        {
          kind: 'range',
          id: 'step',
          label: 'Bin width',
          defaultValue: 4,
          min: 2,
          max: 6,
          step: 1,
          visibleWhen: { controlId: 'strategy', oneOf: ['step'] },
        },
        {
          kind: 'select',
          id: 'thresholdPreset',
          label: 'Threshold set',
          defaultValue: 'regular',
          options: [
            { value: 'regular', label: 'Even thresholds' },
            { value: 'focused', label: 'Dense low range' },
          ],
          visibleWhen: { controlId: 'strategy', oneOf: ['thresholds'] },
        },
      ],
    },
  ],
});

/** 分箱示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: histogramControls,
  canonicalValues: { strategy: 'count', count: 8, step: 4, thresholdPreset: 'regular' },
  presets: [
    { id: 'count', label: '8 bins', values: { strategy: 'count', count: 8, step: 4, thresholdPreset: 'regular' } },
    { id: 'step', label: 'Width 4', values: { strategy: 'step', count: 8, step: 4, thresholdPreset: 'regular' } },
    {
      id: 'thresholds',
      label: 'Explicit thresholds',
      values: { strategy: 'thresholds', count: 8, step: 4, thresholdPreset: 'focused' },
    },
  ],
  relatedApis: ['IRPlotBinTransform.count', 'IRPlotBinTransform.step', 'IRPlotBinTransform.thresholds'],
} satisfies PreviewControlContract;
