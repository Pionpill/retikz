const extraText = extraControlI18n.en;
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateSection } from '../point-coordinate-control';
import { CONNECTED_SCATTER_CONTROL_IDS } from './connected-scatter-basic.controls';
import { connectedScatterData } from './connected-scatter-basic.data';
import { extraControlI18n } from './connected-scatter-basic.i18n';

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

    createPointCoordinateSection(CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem, 'en'),
    {
      label: 'Trajectory',
      controls: [
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.curve,
          label: extraText.curve,
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: extraText.linear },
            { value: 'step', label: extraText.step },
            { value: 'stepBefore', label: extraText.stepBefore },
            { value: 'stepAfter', label: extraText.stepAfter },
            { value: 'basis', label: extraText.basis },
            { value: 'cardinal', label: extraText.cardinal },
            { value: 'catmullRom', label: extraText.catmullRom },
            { value: 'monotoneX', label: extraText.monotoneX },
            { value: 'monotoneY', label: extraText.monotoneY },
            { value: 'natural', label: extraText.natural },
          ],
        },
        {
          kind: 'select',
          id: CONNECTED_SCATTER_CONTROL_IDS.colorMode,
          label: extraText.colorMode,
          defaultValue: 'series',
          options: [
            { value: 'series', label: extraText.series },
            { value: 'mark', label: extraText.mark },
            { value: 'muted', label: extraText.muted },
          ],
        },
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
          id: CONNECTED_SCATTER_CONTROL_IDS.pointOpacity,
          label: 'Point opacity',
          defaultValue: 1,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
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

    {
      label: extraText.appearance,
      controls: [
        {
          kind: 'range',
          id: CONNECTED_SCATTER_CONTROL_IDS.lineOpacity,
          visibleWhen: { controlId: CONNECTED_SCATTER_CONTROL_IDS.colorMode, oneOf: ['series', 'mark'] },
          label: extraText.lineOpacity,
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: connectedScatterBasicControls,
  canonicalValues: {
    [CONNECTED_SCATTER_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [CONNECTED_SCATTER_CONTROL_IDS.curve]: 'linear',
    [CONNECTED_SCATTER_CONTROL_IDS.colorMode]: 'series',
    [CONNECTED_SCATTER_CONTROL_IDS.lineOpacity]: 1,

    [CONNECTED_SCATTER_CONTROL_IDS.pointOpacity]: 1,
    [CONNECTED_SCATTER_CONTROL_IDS.connectNulls]: false,
    [CONNECTED_SCATTER_CONTROL_IDS.lineStyle]: 'solid',
    [CONNECTED_SCATTER_CONTROL_IDS.strokeWidth]: 2,
    [CONNECTED_SCATTER_CONTROL_IDS.pointSize]: 4,
  },
  relatedApis: [
    'ConnectedScatterChart.coordinate',
    'ConnectedScatterProperties.path.curve',
    'ConnectedScatterProperties.colorMode',
    'ConnectedScatterProperties.point.opacity',
    'ConnectedScatterProperties.path.connectNulls',
    'ConnectedScatterProperties.path.dashPattern',
    'ConnectedScatterProperties.path.strokeWidth',
    'ConnectedScatterProperties.point.size',
  ],
} satisfies PreviewControlContract;
