import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sales } from './bar-grouped.data';

/** Stable control id for multi-series bars */
export const BAR_SERIES_MODE_ID = 'bar-series-mode';
export const BAR_SERIES_STACK_OFFSET_ID = 'bar-series-stack-offset';
export const BAR_SERIES_GAP_ID = 'bar-series-gap';
export const BAR_SERIES_COORDINATE_ID = 'interval-series-coordinate';

/** English panel for multi-series arrangements */
export const barSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Series arrangement',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'sales', label: 'Grouped sales', rows: sales }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: BAR_SERIES_COORDINATE_ID,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
    },
    {
      label: 'Arrangement',
      controls: [
        {
          kind: 'select',
          id: BAR_SERIES_MODE_ID,
          label: 'Arrangement',
          defaultValue: 'stack',
          options: [
            { value: 'dodge', label: 'Dodge' },
            { value: 'stack', label: 'Stack' },
            { value: 'normalize-stack', label: 'Normalize stack' },
          ],
        },
        {
          kind: 'select',
          id: BAR_SERIES_STACK_OFFSET_ID,
          label: 'Stack baseline',
          defaultValue: 'zero',
          visibleWhen: { controlId: BAR_SERIES_MODE_ID, oneOf: ['stack'] },
          options: [
            { value: 'zero', label: 'Zero' },
            { value: 'normalize', label: 'Normalize' },
            { value: 'diverging', label: 'Diverging' },
            { value: 'center', label: 'Center' },
            { value: 'overlap', label: 'Overlap' },
          ],
        },
        {
          kind: 'range',
          id: BAR_SERIES_GAP_ID,
          label: 'Band gap',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for multi-series bars */
export const previewControlContract = {
  controls: barSeriesControls,
  canonicalValues: {
    [BAR_SERIES_COORDINATE_ID]: 'cartesian2D',
    [BAR_SERIES_MODE_ID]: 'stack',
    [BAR_SERIES_STACK_OFFSET_ID]: 'zero',
    [BAR_SERIES_GAP_ID]: 0,
  },
  relatedApis: [
    'Plot.coordinate',
    'IntervalMark.series',
    'IntervalMark.group',
    'IntervalMark.arrangement',
    'IntervalMark.stackOffset',
    'PlotScale.paddingInner',
    'PlotScale.paddingOuter',
  ],
} satisfies PreviewControlContract;
