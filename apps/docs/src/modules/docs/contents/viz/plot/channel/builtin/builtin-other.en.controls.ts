import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { otherRows } from './builtin-other.data';

/** English data panel for the other-channel example */
export const builtinOtherControls = definePreviewControls({
  presentation: 'panel',
  title: 'Other channels',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Series data',
          rows: otherRows,
          columns: [{ key: 'step' }, { key: 'value' }, { key: 'series' }],
        },
      ],
    },
    {
      label: 'Path construction',
      controls: [
        { kind: 'switch', id: 'orderEnabled', label: 'Sort by step', defaultValue: true },
        { kind: 'switch', id: 'seriesEnabled', label: 'Split by series', defaultValue: true },
      ],
    },
    {
      label: 'Drawing order',
      controls: [
        {
          kind: 'range',
          id: 'pointZIndex',
          label: 'Series B point zIndex',
          defaultValue: 2,
          min: -2,
          max: 3,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the other-channel example */
export const previewControlContract = {
  controls: builtinOtherControls,
  canonicalValues: {
    orderEnabled: true,
    seriesEnabled: true,
    pointZIndex: 2,
  },
  relatedApis: ['PointMark.zIndex', 'PathMark.order', 'PathMark.series'],
} satisfies PreviewControlContract;
