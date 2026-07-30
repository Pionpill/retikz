import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './line-series.data';

/** Stable control ids for the path series playground */
export const LINE_SERIES_CONTROL_IDS = {
  coordinate: 'path-series-coordinate',
  closed: 'path-series-closed',
  grouping: 'line-series-field',
  showLabels: 'line-series-show-labels',
} as const;

/** Existing series-field control id retained for source compatibility */
export const LINE_SERIES_CONTROL_ID = LINE_SERIES_CONTROL_IDS.grouping;

/** English panel for path series grouping */
export const lineSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path series',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'climate', label: 'City climate', rows: climate }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_SERIES_CONTROL_IDS.closed,
          label: 'Close path',
          defaultValue: false,
          visibleWhen: { controlId: LINE_SERIES_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: 'Grouping',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_IDS.grouping,
          label: 'Split mode',
          defaultValue: 'series',
          options: [
            { value: 'series', label: 'Explicit series' },
            { value: 'color', label: 'Implicit color split' },
            { value: 'none', label: 'Single path' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_SERIES_CONTROL_IDS.showLabels,
          label: 'Show series labels',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for path series grouping */
export const previewControlContract = {
  controls: lineSeriesControls,
  canonicalValues: {
    [LINE_SERIES_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_SERIES_CONTROL_IDS.closed]: false,
    [LINE_SERIES_CONTROL_IDS.grouping]: 'series',
    [LINE_SERIES_CONTROL_IDS.showLabels]: true,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.series',
    'PathMark.color',
    'PathMark.label',
    'PathMark.order',
  ],
} satisfies PreviewControlContract;
