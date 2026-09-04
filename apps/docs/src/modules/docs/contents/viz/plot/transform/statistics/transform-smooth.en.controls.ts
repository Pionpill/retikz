import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { smoothOperationsOf } from './transform-smooth.controls';
import { trendSamples } from './transform-smooth.data';

/** 趋势示例的英文控件 */
export const smoothControls = definePreviewControls({
  presentation: 'panel',
  title: 'Linear trend',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Grouped time samples',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Trend samples' },
            trendSamples,
            smoothOperationsOf,
          ),
          columns: [{ key: 'series' }, { key: 'time' }, { key: 'value' }, { key: 'trendX' }, { key: 'trendY' }],
        },
      ],
    },
    {
      label: 'Trend sampling',
      controls: [
        {
          kind: 'range',
          id: 'sampleCount',
          label: 'Prediction points',
          defaultValue: 32,
          min: 8,
          max: 80,
          step: 8,
        },
        {
          kind: 'select',
          id: 'extentMode',
          label: 'Sampling extent',
          defaultValue: 'observed',
          options: [
            { value: 'observed', label: 'Observed range' },
            { value: 'extend', label: 'Extrapolate both sides' },
          ],
        },
      ],
    },
  ],
});

/** 趋势示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: smoothControls,
  canonicalValues: { sampleCount: 32, extentMode: 'observed' },
  presets: [
    { id: 'observed', label: 'Observed range', values: { sampleCount: 32, extentMode: 'observed' } },
    { id: 'extend', label: 'Extrapolated trend', values: { sampleCount: 48, extentMode: 'extend' } },
  ],
  relatedApis: ['IRPlotSmoothTransform.sampleCount', 'IRPlotSmoothTransform.extent'],
} satisfies PreviewControlContract;
