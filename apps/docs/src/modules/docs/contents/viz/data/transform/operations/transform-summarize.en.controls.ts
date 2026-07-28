import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformTableViews } from '../transform-table-views';
import { orders } from './transform-summarize.data';
import { transformSummarizeOperationOf } from './transform-summarize-preview';

/** English controls for the grouped-summary example */
export const transformSummarizeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Grouped Summary',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Order rows',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            orders,
            transformSummarizeOperationOf,
          ),
        },
      ],
    },
    {
      label: 'Statistical Reduction',
      controls: [
        {
          kind: 'select',
          id: 'reducerKind',
          label: 'Statistic',
          defaultValue: 'sum',
          options: [
            { value: 'sum', label: 'Sum' },
            { value: 'mean', label: 'Mean' },
            { value: 'median', label: 'Median' },
            { value: 'min', label: 'Minimum' },
            { value: 'max', label: 'Maximum' },
            { value: 'count', label: 'Row count' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the grouped-summary example */
export const previewControlContract = {
  controls: transformSummarizeControls,
  canonicalValues: { reducerKind: 'sum' },
  presets: [
    { id: 'sum', label: 'Total revenue', values: { reducerKind: 'sum' } },
    { id: 'mean', label: 'Average order', values: { reducerKind: 'mean' } },
    { id: 'count', label: 'Order count', values: { reducerKind: 'count' } },
  ],
  relatedApis: ['IRDataSummarizeTransform.groupBy', 'IRDataSummarizeTransform.metrics'],
} satisfies PreviewControlContract;
