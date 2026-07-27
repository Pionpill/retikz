import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { regionOrders } from './point-transform.data';

/** 点层变换 playground 的稳定控件 id */
export const POINT_TRANSFORM_CONTROL_IDS = {
  amount: 'point-jitter-amount',
  seed: 'point-jitter-seed',
} as const;

/** 点层变换 playground 的中文属性面板 */
export const pointTransformControls = definePreviewControls({
  presentation: 'panel',
  title: '点层抖动',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'regionOrders', label: '地区订单', rows: regionOrders }],
    },
    {
      label: 'jitter 参数',
      controls: [
        {
          kind: 'range',
          id: POINT_TRANSFORM_CONTROL_IDS.amount,
          label: '最大偏移',
          defaultValue: 1.2,
          min: 0,
          max: 3,
          step: 0.1,
        },
        {
          kind: 'range',
          id: POINT_TRANSFORM_CONTROL_IDS.seed,
          label: '随机种子',
          defaultValue: 12,
          min: 0,
          max: 100,
          step: 1,
        },
      ],
    },
  ],
});

/** 点层变换 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: pointTransformControls,
  canonicalValues: {
    [POINT_TRANSFORM_CONTROL_IDS.amount]: 1.2,
    [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
  },
  presets: [
    {
      id: 'none',
      label: '不抖动',
      values: {
        [POINT_TRANSFORM_CONTROL_IDS.amount]: 0,
        [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
      },
    },
    {
      id: 'spread',
      label: '明显分散',
      values: {
        [POINT_TRANSFORM_CONTROL_IDS.amount]: 2.4,
        [POINT_TRANSFORM_CONTROL_IDS.seed]: 12,
      },
    },
  ],
  relatedApis: ['IRPlotJitterTransform.amount', 'IRPlotJitterTransform.seed'],
} satisfies PreviewControlContract;
