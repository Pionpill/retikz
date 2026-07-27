import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { interruptedArea } from './line-interruption.data';

/** Stable control id for missing-value connections */
export const LINE_INTERRUPTION_CONNECT_NULLS_ID = 'line-interruption-connect-nulls';

/** English panel for missing-value connections */
export const lineInterruptionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Missing values',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'interruptedArea', label: 'Series with missing values', rows: interruptedArea }],
    },
    {
      label: 'Connection',
      controls: [
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONNECT_NULLS_ID,
          label: 'Connect across nulls',
          defaultValue: false,
        },
      ],
    },
  ],
});

/** Stable documentation contract for missing-value connections */
export const previewControlContract = {
  controls: lineInterruptionControls,
  canonicalValues: { [LINE_INTERRUPTION_CONNECT_NULLS_ID]: false },
  relatedApis: ['PathMark.connectNulls', 'PathMark.order'],
} satisfies PreviewControlContract;
