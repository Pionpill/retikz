import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS } from './scatter-penguins-facet-jitter.controls';
import { penguinScatterData } from './scatter-penguins-facet-jitter.data';

/** English controls for the jittered scatter */
export const previewControls = definePreviewControls({
  presentation: 'panel',
  title: 'Jittered penguins',
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
          columns: [
            { key: 'species', label: 'Species' },
            { key: 'billLengthMm', label: 'Bill length (mm)' },
            { key: 'flipperLengthMm', label: 'Flipper length (mm)' },
          ],
        },
      ],
    },
    {
      label: 'Mark',
      controls: [
        {
          kind: 'range',
          id: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter,
          label: 'Horizontal jitter',
          defaultValue: 0.35,
          min: 0,
          max: 1.2,
          step: 0.05,
        },
        {
          kind: 'range',
          id: SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize,
          label: 'Point size',
          defaultValue: 7,
          min: 3,
          max: 12,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable English documentation contract for the jittered scatter */
export const previewControlContract = {
  controls: previewControls,
  canonicalValues: {
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.jitter]: 0.35,
    [SCATTER_PENGUINS_FACET_JITTER_CONTROL_IDS.pointSize]: 7,
  },
  relatedApis: ['ScatterChart.encodings', 'ScatterMark.override', 'ScatterMark.properties', 'Plot.transform'],
} satisfies PreviewControlContract;
