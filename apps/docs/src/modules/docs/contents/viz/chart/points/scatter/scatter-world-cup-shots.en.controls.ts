import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createScatterPointControls } from './scatter-point-controls';
import { SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS } from './scatter-world-cup-shots.controls';
import { messiWorldCupShots } from './scatter-world-cup-shots.data';

/** English controls for the World Cup shot map */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: 'World Cup shot map',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Lionel Messi: 32 non-shootout shots',
          rows: messiWorldCupShots,
          columns: [
            { key: 'opponent', label: 'Opponent' },
            { key: 'minute', label: 'Minute' },
            { key: 'outcome', label: 'Outcome' },
            { key: 'xg', label: 'xG' },
          ],
        },
      ],
    },
    {
      label: 'Marks',
      controls: createScatterPointControls({
        ids: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS,
        size: { label: 'Shot point size', defaultValue: 5, min: 4, max: 14, step: 1 },
        stroke: { toggleLabel: 'Stroke', label: 'Stroke color', defaultValue: '#f8fafc' },
        shape: {
          label: 'Shape',
          defaultValue: 'circle',
          labels: { circle: 'Circle', rectangle: 'Rectangle', ellipse: 'Ellipse', diamond: 'Diamond' },
        },
        opacity: { label: 'Shot point opacity', defaultValue: 0.9, min: 0.4, max: 1, step: 0.02 },
      }),
    },
  ],
});

/** Stable English documentation contract for the World Cup shot map */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]: 5,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStrokeEnabled]: false,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointStroke]: '#f8fafc',
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointShape]: 'circle',
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]: 0.9,
  },
  relatedApis: [
    'ScatterEncodings',
    'ScatterProperties.size',
    'ScatterProperties.stroke',
    'ScatterProperties.shape',
    'ScatterProperties.opacity',
  ],
} satisfies PreviewControlContract;
