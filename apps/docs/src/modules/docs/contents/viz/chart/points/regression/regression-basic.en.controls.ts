import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { irisRegressionData } from './regression-basic.data';

/** English controls for the basic Regression showcase */
export const regressionBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Regression trend',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Complete UCI Iris observations',
          rows: irisRegressionData,
          columns: [{ key: 'sepalLengthCm' }, { key: 'petalLengthCm' }, { key: 'species' }],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: REGRESSION_BASIC_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Fit',
      controls: [
        {
          kind: 'switch',
          id: REGRESSION_BASIC_CONTROL_IDS.groupBySpecies,
          label: 'Fit each species',
          defaultValue: true,
        },
        {
          kind: 'select',
          id: REGRESSION_BASIC_CONTROL_IDS.method,
          label: 'Regression method',
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: 'Linear' },
            { value: 'quadratic', label: 'Quadratic' },
            { value: 'polynomial', label: 'Configurable polynomial' },
            { value: 'logarithmic', label: 'Logarithmic' },
            { value: 'exponential', label: 'Exponential' },
            { value: 'power', label: 'Power' },
          ],
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.order,
          label: 'Polynomial order',
          defaultValue: 3,
          min: 2,
          max: 6,
          step: 1,
          visibleWhen: { controlId: REGRESSION_BASIC_CONTROL_IDS.method, oneOf: ['polynomial'] },
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.sampleCount,
          label: 'Trend samples',
          defaultValue: 64,
          min: 16,
          max: 128,
          step: 8,
        },
      ],
    },
    {
      label: 'Observations',
      controls: [
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.pointOpacity,
          label: 'Opacity',
          defaultValue: 0.55,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Trend line',
      controls: [
        {
          kind: 'color',
          id: REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor,
          label: 'Color',
          defaultValue: '#e11d48',
          visibleWhen: { controlId: REGRESSION_BASIC_CONTROL_IDS.groupBySpecies, oneOf: [false] },
        },
        {
          kind: 'select',
          id: REGRESSION_BASIC_CONTROL_IDS.trendLineStyle,
          label: 'Line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity,
          label: 'Opacity',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the basic Regression showcase */
export const previewControlContract = {
  controls: regressionBasicControls,
  canonicalValues: {
    [REGRESSION_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [REGRESSION_BASIC_CONTROL_IDS.groupBySpecies]: true,
    [REGRESSION_BASIC_CONTROL_IDS.method]: 'linear',
    [REGRESSION_BASIC_CONTROL_IDS.order]: 3,
    [REGRESSION_BASIC_CONTROL_IDS.sampleCount]: 64,
    [REGRESSION_BASIC_CONTROL_IDS.pointOpacity]: 0.55,
    [REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor]: '#e11d48',
    [REGRESSION_BASIC_CONTROL_IDS.trendLineStyle]: 'solid',
    [REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth]: 2,
    [REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity]: 0.9,
  },
  relatedApis: [
    'RegressionChart.coordinate',
    'RegressionEncodings.series',
    'RegressionProperties.method',
    'RegressionProperties.sampleCount',
    'RegressionProperties.point.opacity',
    'RegressionProperties.trend.stroke',
    'RegressionProperties.trend.dashPattern',
    'RegressionProperties.trend.strokeWidth',
    'RegressionProperties.trend.strokeOpacity',
  ],
} satisfies PreviewControlContract;
