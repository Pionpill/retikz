import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { CONNECTED_SCATTER_CONTROL_IDS } from './connected-scatter-basic.controls';
import { connectedScatterData } from './connected-scatter-basic.data';

export const connectedScatterBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Trajectory and observations',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank country trajectories',
          rows: connectedScatterData,
          columns: [{ key: 'country' }, { key: 'year' }, { key: 'urbanization' }, { key: 'lifeExpectancy' }],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Encodings',
      controls: [
        {
          kind: 'switch',
          id: CONNECTED_SCATTER_CONTROL_IDS.seriesByCountry,
          label: 'Split trajectories by country',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Trajectory',
      controls: [
        {
          kind: 'switch',
          id: CONNECTED_SCATTER_CONTROL_IDS.connectNulls,
          label: 'Connect across missing values',
          defaultValue: false,
        },
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.lineStyle,
          label: 'Line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: 'Observations',
      controls: [
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.pointSize,
          label: 'Radius',
          defaultValue: 4,
          min: 2,
          max: 10,
          step: 1,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: connectedScatterBasicControls,
  canonicalValues: {
    [CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [CONNECTED_SCATTER_CONTROL_IDS.seriesByCountry]: true,
    [CONNECTED_SCATTER_CONTROL_IDS.connectNulls]: false,
    [CONNECTED_SCATTER_CONTROL_IDS.lineStyle]: 'solid',
    [CONNECTED_SCATTER_CONTROL_IDS.strokeWidth]: 2,
    [CONNECTED_SCATTER_CONTROL_IDS.pointSize]: 4,
  },
  relatedApis: [
    'ConnectedScatterChart.coordinate',
    'ConnectedScatterEncodings.series',
    'ConnectedScatterProperties.path.connectNulls',
    'ConnectedScatterProperties.path.dashPattern',
    'ConnectedScatterProperties.path.strokeWidth',
    'ConnectedScatterProperties.point.size',
  ],
} satisfies PreviewControlContract;
