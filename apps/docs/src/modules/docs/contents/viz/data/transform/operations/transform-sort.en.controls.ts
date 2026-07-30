import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { monthlyRevenue } from './transform-sort.data';
import { transformSortOperationOf } from './transform-sort-preview';

/** English controls for the row-sort example */
export const transformSortControls = definePreviewControls({
  presentation: 'panel',
  title: 'Row Sort',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Monthly revenue',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            monthlyRevenue,
            transformSortOperationOf,
          ),
        },
      ],
    },
    {
      label: 'Sort Operation',
      controls: [
        {
          kind: 'select',
          id: 'field',
          label: 'Field',
          defaultValue: 'month',
          options: [
            { value: 'month', label: 'Month' },
            { value: 'revenue', label: 'Revenue' },
          ],
        },
        {
          kind: 'select',
          id: 'order',
          label: 'Direction',
          defaultValue: 'ascending',
          options: [
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the row-sort example */
export const previewControlContract = {
  controls: transformSortControls,
  canonicalValues: { field: 'month', order: 'ascending' },
  presets: [
    { id: 'month-ascending', label: 'Month ascending', values: { field: 'month', order: 'ascending' } },
    { id: 'month-descending', label: 'Month descending', values: { field: 'month', order: 'descending' } },
    { id: 'revenue-descending', label: 'Highest revenue first', values: { field: 'revenue', order: 'descending' } },
  ],
  relatedApis: ['IRDataSortTransform.field', 'IRDataSortTransform.order'],
} satisfies PreviewControlContract;
