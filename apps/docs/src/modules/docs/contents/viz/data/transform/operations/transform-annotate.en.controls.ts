import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformTableViews } from '../transform-table-views';
import { storeRevenue } from './transform-annotate.data';
import { transformAnnotateOperationOf } from './transform-annotate-preview';

/** English controls for the statistical-annotation example */
export const transformAnnotateControls = definePreviewControls({
  presentation: 'panel',
  title: 'Statistical Annotation',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Store revenue',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            storeRevenue,
            transformAnnotateOperationOf,
          ),
        },
      ],
    },
    {
      label: 'Broadcast Statistic',
      controls: [
        {
          kind: 'select',
          id: 'reducerKind',
          label: 'Statistic',
          defaultValue: 'mean',
          options: [
            { value: 'mean', label: 'Mean' },
            { value: 'median', label: 'Median' },
            { value: 'min', label: 'Minimum' },
            { value: 'max', label: 'Maximum' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the statistical-annotation example */
export const previewControlContract = {
  controls: transformAnnotateControls,
  canonicalValues: { reducerKind: 'mean' },
  presets: [
    { id: 'mean', label: 'Group mean', values: { reducerKind: 'mean' } },
    { id: 'median', label: 'Group median', values: { reducerKind: 'median' } },
    { id: 'max', label: 'Group maximum', values: { reducerKind: 'max' } },
  ],
  relatedApis: ['IRDataAnnotateTransform.groupBy', 'IRDataAnnotateTransform.metrics'],
} satisfies PreviewControlContract;
