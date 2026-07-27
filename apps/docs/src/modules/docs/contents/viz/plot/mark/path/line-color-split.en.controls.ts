import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { channelTrend } from './line-series.data';

/** Stable control id for implicit color splitting */
export const LINE_COLOR_CONTROL_ID = 'line-color-field';

/** English panel for implicit color splitting */
export const lineColorSplitControls = definePreviewControls({
  presentation: 'panel',
  title: 'Color splitting',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'channelTrend', label: 'Categorical trend', rows: channelTrend }],
    },
    {
      label: 'Color channel',
      controls: [
        {
          kind: 'select',
          id: LINE_COLOR_CONTROL_ID,
          label: 'color field',
          defaultValue: 'channel',
          options: [
            { value: 'channel', label: 'channel' },
            { value: 'none', label: 'No color split' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for implicit color splitting */
export const previewControlContract = {
  controls: lineColorSplitControls,
  canonicalValues: { [LINE_COLOR_CONTROL_ID]: 'channel' },
  relatedApis: ['PathMark.color', 'PathMark.order'],
} satisfies PreviewControlContract;
