import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { storeRevenue } from './bar-transform.data';

/** Stable control id for the derived interval baseline */
export const BAR_TRANSFORM_BASELINE_ID = 'bar-transform-offset';
export const BAR_TRANSFORM_GAP_ID = 'bar-transform-gap';

/** English panel for the derive-interval transform */
export const barTransformControls = definePreviewControls({
  presentation: 'panel',
  title: 'Derived interval',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'storeRevenue', label: 'Store revenue', rows: storeRevenue }],
    },
    {
      label: 'Transform',
      controls: [
        {
          kind: 'range',
          id: BAR_TRANSFORM_BASELINE_ID,
          label: 'Baseline',
          defaultValue: 0,
          min: 0,
          max: 20,
          step: 2,
        },
      ],
    },
    {
      label: 'Layout',
      controls: [
        {
          kind: 'range',
          id: BAR_TRANSFORM_GAP_ID,
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

/** Stable documentation contract for the derived interval baseline */
export const previewControlContract = {
  controls: barTransformControls,
  canonicalValues: { [BAR_TRANSFORM_BASELINE_ID]: 0, [BAR_TRANSFORM_GAP_ID]: 0 },
  relatedApis: ['IntervalMark.transform', 'IntervalMark.arrangement', 'Scale.paddingInner', 'Scale.paddingOuter'],
} satisfies PreviewControlContract;
