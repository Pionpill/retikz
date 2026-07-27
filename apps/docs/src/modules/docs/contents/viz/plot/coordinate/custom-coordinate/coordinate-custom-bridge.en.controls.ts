import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { grid } from './coordinate-custom-bridge.data';

/** Stable control ids for the custom-coordinate playground */
export const CUSTOM_COORDINATE_CONTROL_IDS = {
  archHeight: 'custom-coordinate-arch-height',
} as const;

/** English panel for the custom coordinate */
export const customCoordinateControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom coordinate',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-coordinate-grid',
          label: 'Regular grid',
          rows: grid,
          columns: [{ key: 'x' }, { key: 'y' }],
        },
      ],
    },
    {
      label: 'Projection',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_COORDINATE_CONTROL_IDS.archHeight,
          label: 'Arch height',
          defaultValue: 60,
          min: 0,
          max: 100,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the custom-coordinate playground */
export const previewControlContract = {
  controls: customCoordinateControls,
  canonicalValues: { [CUSTOM_COORDINATE_CONTROL_IDS.archHeight]: 60 },
  relatedApis: ['Plot.coordinate'],
} satisfies PreviewControlContract;
