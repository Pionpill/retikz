import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { jitterOperationOf } from './transform-jitter.controls';
import { samples } from './transform-jitter.data';

/** 抖动示例的英文控件 */
export const jitterControls = definePreviewControls({
  presentation: 'panel',
  title: 'Deterministic jitter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Dose and response',
          views: createPlotTransformTableViews({ source: 'Source', result: 'Jittered' }, samples, jitterOperationOf),
          columns: [
            { key: 'dose', label: 'Dose' },
            { key: 'response', label: 'Response' },
          ],
        },
      ],
    },
    {
      label: 'Jitter parameters',
      controls: [
        { kind: 'range', id: 'amount', label: 'Maximum offset', defaultValue: 0.18, min: 0, max: 0.4, step: 0.01 },
        { kind: 'range', id: 'seed', label: 'Random seed', defaultValue: 42, min: 0, max: 100, step: 1 },
      ],
    },
  ],
});

/** 抖动示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: jitterControls,
  canonicalValues: { amount: 0.18, seed: 42 },
  presets: [
    { id: 'subtle', label: 'Subtle jitter', values: { amount: 0.1, seed: 42 } },
    { id: 'strong', label: 'Strong jitter', values: { amount: 0.32, seed: 42 } },
  ],
  relatedApis: ['IRPlotJitterTransform.amount', 'IRPlotJitterTransform.seed'],
} satisfies PreviewControlContract;
