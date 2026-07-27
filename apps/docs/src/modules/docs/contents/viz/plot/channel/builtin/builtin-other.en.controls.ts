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
          columns: [
            { key: 'step', label: 'Step' },
            { key: 'value', label: 'Value' },
            { key: 'series', label: 'Series' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the other-channel example */
export const previewControlContract = {
  controls: builtinOtherControls,
  canonicalValues: {},
  relatedApis: ['PathMark.order', 'PathMark.series'],
} satisfies PreviewControlContract;
