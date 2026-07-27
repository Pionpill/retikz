import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { glyphRows } from './mark-custom.data';

/** Stable control ids for the custom-mark playground */
export const CUSTOM_MARK_CONTROL_IDS = {
  size: 'custom-mark-size',
  fill: 'custom-mark-fill',
} as const;

/** English panel for the custom mark */
export const customMarkControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom mark',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-mark-rows',
          label: 'Monthly sales',
          rows: glyphRows,
          columns: [{ key: 'month' }, { key: 'sales' }],
        },
      ],
    },
    {
      label: 'diamond config',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_MARK_CONTROL_IDS.size,
          label: 'Minimum size',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 2,
        },
        {
          kind: 'color',
          id: CUSTOM_MARK_CONTROL_IDS.fill,
          label: 'Fill color',
          defaultValue: '#f59e0b',
        },
      ],
    },
  ],
});

/** Stable documentation contract for the custom-mark playground */
export const previewControlContract = {
  controls: customMarkControls,
  canonicalValues: {
    [CUSTOM_MARK_CONTROL_IDS.size]: 16,
    [CUSTOM_MARK_CONTROL_IDS.fill]: '#f59e0b',
  },
  relatedApis: ['Plot.spec'],
} satisfies PreviewControlContract;
