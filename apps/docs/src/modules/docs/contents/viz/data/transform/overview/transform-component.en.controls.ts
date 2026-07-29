import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { regionalOrders } from './transform-component.data';
import { transformComponentOperationsOf } from './transform-component-preview';

/** English controls for the Transform declaration-order example */
export const transformComponentControls = definePreviewControls({
  presentation: 'panel',
  title: 'Transform Input',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Order rows',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            regionalOrders,
            transformComponentOperationsOf,
          ),
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Transform declaration-order example */
export const previewControlContract = {
  controls: transformComponentControls,
  canonicalValues: {},
  relatedApis: [],
} satisfies PreviewControlContract;
