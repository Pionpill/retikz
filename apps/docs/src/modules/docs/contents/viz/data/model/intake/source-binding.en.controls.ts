import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { currentSales, financeFeed, forecastSales } from './source-binding.data';

/** English controls for source binding */
export const sourceBindingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Source binding',
  sections: [
    {
      label: 'Input data',
      controls: [
        {
          kind: 'table',
          id: 'currentRows',
          label: 'Current data',
          rows: currentSales,
          visibleWhen: { controlId: 'source', oneOf: ['current'] },
        },
        {
          kind: 'table',
          id: 'forecastRows',
          label: 'Forecast data',
          rows: forecastSales,
          visibleWhen: { controlId: 'source', oneOf: ['forecast'] },
        },
        {
          kind: 'table',
          id: 'financeRows',
          label: 'Finance feed',
          rows: financeFeed,
          visibleWhen: { controlId: 'source', oneOf: ['finance'] },
        },
      ],
    },
    {
      label: 'Intake path',
      controls: [
        {
          kind: 'select',
          id: 'source',
          label: 'Source',
          defaultValue: 'current',
          options: [
            { value: 'current', label: 'Current sales · matching fields' },
            { value: 'forecast', label: 'Forecast sales · matching fields' },
            { value: 'finance', label: 'Finance feed · fieldMap' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for source binding */
export const previewControlContract = {
  controls: sourceBindingControls,
  canonicalValues: { source: 'current' },
  relatedApis: ['Plot.data', 'Plot.model', 'Plot.fieldMap'],
} satisfies PreviewControlContract;
