import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { laborCosts } from './bar-variable-width.data';
import { intervalHistogramOperationOf } from './interval-histogram.controls';
import { measurements } from './interval-histogram.data';

/** Stable control ids for continuous interval modes */
export const INTERVAL_CONTINUOUS_MODE_ID = 'interval-continuous-mode';
export const INTERVAL_HISTOGRAM_COUNT_ID = 'interval-histogram-thresholds';
export const INTERVAL_CONTINUOUS_COORDINATE_ID = 'interval-continuous-coordinate';

/** Stable control id for horizontal continuous-interval padding */
export const INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID = 'interval-continuous-horizontal-padding';

/** Stable control id for vertical continuous-interval padding */
export const INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID = 'interval-continuous-vertical-padding';

/** English panel for continuous intervals and variable widths */
export const intervalHistogramControls = definePreviewControls({
  presentation: 'panel',
  title: 'Continuous intervals',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'measurements',
          label: 'Measurements',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Binned' },
            measurements,
            intervalHistogramOperationOf,
          ),
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['histogram'] },
        },
        {
          kind: 'table',
          id: 'laborCosts',
          label: 'Labor costs',
          rows: laborCosts,
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['proportional'] },
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: INTERVAL_CONTINUOUS_COORDINATE_ID,
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
      label: 'Interval source',
      controls: [
        {
          kind: 'select',
          id: INTERVAL_CONTINUOUS_MODE_ID,
          label: 'Mode',
          defaultValue: 'histogram',
          options: [
            { value: 'histogram', label: 'Histogram bins' },
            { value: 'proportional', label: 'Proportional width' },
          ],
        },
        {
          kind: 'range',
          id: INTERVAL_HISTOGRAM_COUNT_ID,
          label: 'Bin count',
          defaultValue: 8,
          min: 4,
          max: 16,
          step: 1,
          visibleWhen: { controlId: INTERVAL_CONTINUOUS_MODE_ID, oneOf: ['histogram'] },
        },
      ],
    },
    {
      label: 'Scale padding',
      controls: [
        {
          kind: 'range',
          id: INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID,
          label: 'Horizontal padding',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
        {
          kind: 'range',
          id: INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID,
          label: 'Vertical padding',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** Stable documentation contract for histogram binning */
export const previewControlContract = {
  controls: intervalHistogramControls,
  canonicalValues: {
    [INTERVAL_CONTINUOUS_COORDINATE_ID]: 'cartesian2D',
    [INTERVAL_CONTINUOUS_MODE_ID]: 'histogram',
    [INTERVAL_HISTOGRAM_COUNT_ID]: 8,
    [INTERVAL_CONTINUOUS_HORIZONTAL_PADDING_ID]: 0,
    [INTERVAL_CONTINUOUS_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: [
    'Plot.coordinate',
    'Transform.bin',
    'IntervalMark.x0',
    'IntervalMark.x1',
    'IntervalMark.width',
    'Scale.domainPadding',
  ],
} satisfies PreviewControlContract;
