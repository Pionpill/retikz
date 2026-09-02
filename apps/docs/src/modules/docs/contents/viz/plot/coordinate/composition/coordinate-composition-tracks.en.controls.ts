import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS } from './coordinate-composition-tracks.controls';
import { operationsRows } from './coordinate-composition-tracks.data';

/** Shared-x-axis track demo controls in English */
export const coordinateCompositionTracksControls = definePreviewControls({
  presentation: 'panel',
  title: 'Shared x-axis tracks',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Operational metrics',
          rows: operationsRows,
          columns: [{ key: 'day' }, { key: 'trend' }, { key: 'drawdown' }, { key: 'signal' }],
        },
      ],
    },
    {
      label: 'Track layout',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.bandProfile,
          label: 'Space allocation',
          defaultValue: 'balanced',
          options: [
            { value: 'balanced', label: 'Balanced' },
            { value: 'trend-focus', label: 'Emphasize trend' },
            { value: 'signal-focus', label: 'Emphasize signal' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.trackGap,
          label: 'Track gap',
          defaultValue: 6,
          min: 0,
          max: 20,
          step: 2,
        },
      ],
    },
    {
      label: 'Axes',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.xGridVisible,
          label: 'Vertical grid (x-axis)',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.yGridVisible,
          label: 'Horizontal grid (y-axis)',
          defaultValue: true,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes,
            oneOf: [true],
          },
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes,
          label: 'Show local y-axes',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Layer style',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.lineWidth,
          label: 'Line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.drawdownAreaVisible,
          label: 'Show drawdown area',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.signalPointSize,
          label: 'Signal point size',
          defaultValue: 7,
          min: 3,
          max: 14,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the shared-x-axis track demo */
export const previewControlContract = {
  controls: coordinateCompositionTracksControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.bandProfile]: 'balanced',
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.trackGap]: 6,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.localAxes]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.drawdownAreaVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_CONTROL_IDS.signalPointSize]: 7,
  },
  relatedApis: [
    'PlotScaffold.spacing',
    'PlotTrack.band',
    'PlotAxis.grid',
    'PathMark.strokeWidth',
    'PathMark.closure',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
