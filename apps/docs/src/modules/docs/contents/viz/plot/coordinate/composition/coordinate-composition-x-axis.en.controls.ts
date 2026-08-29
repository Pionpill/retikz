import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS } from './coordinate-composition-x-axis.controls';
import { releaseRows } from './coordinate-composition-x-axis.data';

/** Dual-x-axis demo controls in English */
export const coordinateCompositionXAxisControls = definePreviewControls({
  presentation: 'panel',
  title: 'Dual x-axes',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Release progress',
          rows: releaseRows,
          columns: [
            { key: 'elapsedDay', label: 'Elapsed day' },
            { key: 'calendarDay', label: 'Calendar day' },
            { key: 'completed', label: 'Completed' },
            { key: 'forecast', label: 'Forecast' },
          ],
        },
      ],
    },
    {
      label: 'Axis binding',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis,
          label: 'Forecast x-axis',
          defaultValue: 'calendar',
          options: [
            { value: 'calendar', label: 'Independent axis' },
            { value: 'default', label: 'Default axis' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide,
          label: 'Extra axis side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible,
          label: 'Vertical grid (x-axis)',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible,
          label: 'Horizontal grid (y-axis)',
          defaultValue: false,
        },
      ],
    },
    {
      label: 'Layer style',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth,
          label: 'Completed line width',
          defaultValue: 2.5,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth,
          label: 'Forecast line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible,
          label: 'Show forecast points',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize,
          label: 'Forecast point size',
          defaultValue: 6,
          min: 3,
          max: 14,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the dual-x-axis demo */
export const previewControlContract = {
  controls: coordinateCompositionXAxisControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis]: 'calendar',
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide]: 'top',
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible]: false,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible]: false,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth]: 2.5,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth]: 2,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible]: true,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize]: 6,
  },
  relatedApis: [
    'PlotAxis.id',
    'PlotAxis.placement',
    'PlotAxis.grid',
    'PathMark.xAxisId',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
