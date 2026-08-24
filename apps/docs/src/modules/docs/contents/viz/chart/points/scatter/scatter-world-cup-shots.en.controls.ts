import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

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
      controls: [
        {
          kind: 'range',
          id: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize,
          label: 'Shot point size',
          defaultValue: 8,
          min: 4,
          max: 14,
          step: 1,
        },
        {
          kind: 'range',
          id: SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity,
          label: 'Shot point opacity',
          defaultValue: 0.9,
          min: 0.4,
          max: 1,
          step: 0.02,
        },
      ],
    },
  ],
});

/** Stable English documentation contract for the World Cup shot map */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointSize]: 8,
    [SCATTER_WORLD_CUP_SHOTS_CONTROL_IDS.pointOpacity]: 0.9,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.override', 'ScatterMark.properties'],
} satisfies PreviewControlContract;
