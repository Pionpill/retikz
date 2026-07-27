import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scaleCustomRows } from './scale-custom.data';

/** Stable control ids for the custom-scale playground */
export const CUSTOM_SCALE_CONTROL_IDS = {
  exponent: 'custom-scale-exponent',
} as const;

/** English panel for the custom scale */
export const customScaleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom scale',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-scale-rows',
          label: 'Points',
          rows: scaleCustomRows,
          columns: [{ key: 'x' }, { key: 'y' }, { key: 'tier' }],
        },
      ],
    },
    {
      label: 'ease-position',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_SCALE_CONTROL_IDS.exponent,
          label: 'Exponent',
          defaultValue: 1.8,
          min: 0.6,
          max: 3,
          step: 0.2,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the custom-scale playground */
export const previewControlContract = {
  controls: customScaleControls,
  canonicalValues: { [CUSTOM_SCALE_CONTROL_IDS.exponent]: 1.8 },
  relatedApis: ['Plot.spec'],
} satisfies PreviewControlContract;
