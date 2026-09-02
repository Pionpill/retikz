import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS } from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';
import { createScatterPointControls } from './scatter-point-controls';

/** English controls for the faceted jittered scatter */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: 'Faceted penguins',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Deterministic Palmer Penguins sample',
          rows: penguinScatterData,
          columns: [{ key: 'species' }, { key: 'billLengthMm' }, { key: 'flipperLengthMm' }],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        createPointCoordinateControl({
          id: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.coordinateSystem,
          label: 'Coordinate system',
          cartesianLabel: 'Cartesian',
          polarLabel: 'Polar',
        }),
      ],
    },
    {
      label: 'Mark',
      controls: createScatterPointControls({
        ids: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS,
        size: { label: 'Point size', defaultValue: 5, min: 3, max: 12, step: 1 },
        fill: { toggleLabel: 'Fill', label: 'Fill color', defaultValue: 'currentColor' },
        stroke: { toggleLabel: 'Stroke', label: 'Stroke color', defaultValue: 'currentColor' },
        shape: {
          label: 'Shape',
          defaultValue: 'circle',
          labels: { circle: 'Circle', rectangle: 'Rectangle', diamond: 'Diamond' },
        },
        opacity: { label: 'Opacity', defaultValue: 0.72, min: 0.3, max: 1, step: 0.04 },
      }),
    },
  ],
});

/** Stable English documentation contract for the faceted jittered scatter */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize]: 5,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFillEnabled]: false,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointFill]: 'currentColor',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointStroke]: 'currentColor',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointOpacity]: 0.72,
  },
  relatedApis: [
    'ScatterChart.coordinate',
    'ScatterProperties.size',
    'ScatterProperties.fill',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
