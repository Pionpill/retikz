import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS } from './coordinate-composition-scopes.controls';
import { weatherRows } from './coordinate-composition-scopes.data';

/** Dual-y-axis demo controls in English */
export const coordinateCompositionScopesControls = definePreviewControls({
  presentation: 'panel',
  title: 'Dual y-axes',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Weather metrics',
          rows: weatherRows,
          columns: [
            { key: 'day', label: 'Day' },
            { key: 'temperature', label: 'Temperature' },
            { key: 'rainfall', label: 'Rainfall' },
          ],
        },
      ],
    },
    {
      label: 'Axis binding',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis,
          label: 'Rainfall y-axis',
          defaultValue: 'rainfall',
          options: [
            { value: 'rainfall', label: 'Independent axis' },
            { value: 'default', label: 'Default axis' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide,
          label: 'Extra axis side',
          defaultValue: 'right',
          options: [
            { value: 'right', label: 'Right' },
            { value: 'left', label: 'Left' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible,
          label: 'Vertical grid (x-axis)',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible,
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
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth,
          label: 'Temperature line width',
          defaultValue: 2.5,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth,
          label: 'Rainfall line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible,
          label: 'Show rainfall points',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize,
          label: 'Rainfall point size',
          defaultValue: 6,
          min: 3,
          max: 14,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the dual-y-axis demo */
export const previewControlContract = {
  controls: coordinateCompositionScopesControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis]: 'rainfall',
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide]: 'right',
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible]: false,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible]: false,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth]: 2.5,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth]: 2,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible]: true,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize]: 6,
  },
  relatedApis: [
    'PlotAxis.id',
    'PlotAxis.placement',
    'PlotAxis.grid',
    'PathMark.yAxisId',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
