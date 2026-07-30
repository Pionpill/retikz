import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { POINT_TRANSFORM_CONTROL_IDS, pointTransformOperationOf } from './point-transform.controls';
import { regionOrders } from './point-transform.data';

/** 点层变换 playground 的英文属性面板 */
export const pointTransformControls = definePreviewControls({
  presentation: 'panel',
  title: 'Point-layer jitter',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'regionOrders',
          label: 'Regional orders',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Jittered' },
            regionOrders,
            pointTransformOperationOf,
          ),
        },
      ],
    },
    {
      label: 'Jitter parameters',
      controls: [
        {
          kind: 'range',
          id: POINT_TRANSFORM_CONTROL_IDS.amount,
          label: 'Maximum offset',
          defaultValue: 1.2,
          min: 0,
          max: 3,
          step: 0.1,
        },
        {
          kind: 'range',
          id: POINT_TRANSFORM_CONTROL_IDS.seed,
          label: 'Random seed',
          defaultValue: 12,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
  ],
});

/** 点层变换 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: pointTransformControls,
  canonicalValues: {
    [POINT_TRANSFORM_CONTROL_IDS.amount]: 1.2,
    [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
  },
  presets: [
    {
      id: 'none',
      label: 'No jitter',
      values: {
        [POINT_TRANSFORM_CONTROL_IDS.amount]: 0,
        [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
      },
    },
    {
      id: 'spread',
      label: 'Wide spread',
      values: {
        [POINT_TRANSFORM_CONTROL_IDS.amount]: 2.4,
        [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
      },
    },
  ],
  relatedApis: ['IRPlotJitterTransform.amount', 'IRPlotJitterTransform.seed'],
} satisfies PreviewControlContract;
