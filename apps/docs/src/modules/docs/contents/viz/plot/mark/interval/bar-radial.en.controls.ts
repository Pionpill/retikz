import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { rainfall } from './bar-radial.data';

/** Stable control id for radial-bar inner radius */
export const BAR_RADIAL_INNER_RADIUS_ID = 'bar-radial-inner-radius';
export const BAR_RADIAL_GAP_ID = 'bar-radial-gap';

/** English panel for radial-bar coordinates */
export const barRadialControls = definePreviewControls({
  presentation: 'panel',
  title: 'Radial bars',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'rainfall', label: 'Monthly rainfall', rows: rainfall }],
    },
    {
      label: 'Polar coordinate',
      controls: [
        {
          kind: 'range',
          id: BAR_RADIAL_INNER_RADIUS_ID,
          label: 'Inner radius',
          defaultValue: 0,
          min: 0,
          max: 0.7,
          step: 0.1,
        },
        {
          kind: 'range',
          id: BAR_RADIAL_GAP_ID,
          label: 'Bar gap',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for radial-bar inner radius */
export const previewControlContract = {
  controls: barRadialControls,
  canonicalValues: { [BAR_RADIAL_INNER_RADIUS_ID]: 0, [BAR_RADIAL_GAP_ID]: 0 },
  relatedApis: ['IntervalMark.x', 'IntervalMark.y', 'Scale.paddingInner', 'Scale.paddingOuter'],
} satisfies PreviewControlContract;
