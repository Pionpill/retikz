import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sizeSales } from './data-model-order.data';

/** English controls for the category-order example */
export const dataModelOrderControls = definePreviewControls({
  presentation: 'panel',
  title: 'Category order',
  sections: [
    {
      label: 'Input data',
      controls: [{ kind: 'table', id: 'rows', label: 'Source rows', rows: sizeSales }],
    },
    {
      label: 'Category domain',
      controls: [
        {
          kind: 'select',
          id: 'orderMode',
          label: 'Order',
          defaultValue: 'appearance',
          options: [
            { value: 'appearance', label: 'Data appearance' },
            { value: 'ascending', label: 'Ascending' },
            { value: 'descending', label: 'Descending' },
            { value: 'business', label: 'Business order S → XL' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for category order */
export const previewControlContract = {
  controls: dataModelOrderControls,
  canonicalValues: { orderMode: 'appearance' },
  presets: [
    { id: 'appearance', label: 'Appearance order', values: { orderMode: 'appearance' } },
    { id: 'business', label: 'Business order', values: { orderMode: 'business' } },
  ],
  relatedApis: ['IRDataFieldDefinition.order'],
} satisfies PreviewControlContract;
