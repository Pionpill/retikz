import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS } from './coordinate-composition-tracks-polar.controls';
import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

/** Polar-track demo controls in English */
export const coordinateCompositionTracksPolarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polar tracks',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Journey metrics',
          rows: polarTrackRows,
          columns: [{ key: 'area' }, { key: 'order' }, { key: 'signal' }, { key: 'capacity' }, { key: 'outer' }],
        },
      ],
    },
    {
      label: 'Polar coordinate',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius,
          label: 'Inner radius',
          defaultValue: 0,
          min: 0,
          max: 0.6,
          step: 0.05,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle,
          label: 'Start angle',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle,
          label: 'Sweep angle',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
        },
      ],
    },
    {
      label: 'Track layout',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap,
          label: 'Track gap',
          defaultValue: 8,
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
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible,
          label: 'Radial grid (x / angle)',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible,
          label: 'Circular grid (y / radius)',
          defaultValue: true,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes,
            oneOf: [true],
          },
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes,
          label: 'Show local radial axes',
          defaultValue: true,
        },
      ],
    },
    {
      label: 'Layer style',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth,
          label: 'Line width',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize,
          label: 'Point size',
          defaultValue: 6,
          min: 3,
          max: 12,
          step: 1,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle,
          label: 'Outer sector gap',
          defaultValue: 2,
          min: 0,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity,
          label: 'Outer sector opacity',
          defaultValue: 0.72,
          min: 0.1,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the polar-track demo */
export const previewControlContract = {
  controls: coordinateCompositionTracksPolarControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.innerRadius]: 0,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.startAngle]: 0,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sweepAngle]: 360,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.trackGap]: 8,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.xGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.yGridVisible]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.localAxes]: true,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.lineWidth]: 2,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.pointSize]: 6,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorPadAngle]: 2,
    [COORDINATE_COMPOSITION_TRACKS_POLAR_CONTROL_IDS.sectorOpacity]: 0.72,
  },
  relatedApis: [
    'Plot.coordinate',
    'PlotScaffold.spacing',
    'PlotAxis.grid',
    'PathMark.strokeWidth',
    'PointMark.size',
    'IntervalMark.padAngle',
    'IntervalMark.fillOpacity',
  ],
} satisfies PreviewControlContract;
