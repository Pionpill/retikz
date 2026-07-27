import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './line-series.data';

/** Stable control id for the path series playground */
export const LINE_SERIES_CONTROL_ID = 'line-series-field';

/** English panel for path series grouping */
export const lineSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path series',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'climate', label: 'City climate', rows: climate }],
    },
    {
      label: 'Grouping',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_ID,
          label: 'series field',
          defaultValue: 'city',
          options: [
            { value: 'city', label: 'city' },
            { value: 'none', label: 'No series' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for path series grouping */
export const previewControlContract = {
  controls: lineSeriesControls,
  canonicalValues: { [LINE_SERIES_CONTROL_ID]: 'city' },
  relatedApis: ['PathMark.series', 'PathMark.order'],
} satisfies PreviewControlContract;
