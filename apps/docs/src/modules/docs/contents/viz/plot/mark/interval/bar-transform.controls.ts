import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { storeRevenue } from './bar-transform.data';

/** 区间派生基线 playground 的稳定控件 id */
export const BAR_TRANSFORM_BASELINE_ID = 'bar-transform-offset';
export const BAR_TRANSFORM_GAP_ID = 'bar-transform-gap';

/** 根据实时控件值创建区间派生 operation */
export const barTransformOperationOf = (values: { [BAR_TRANSFORM_BASELINE_ID]: number }) => ({
  kind: 'derive-interval',
  from: 'revenue',
  baseline: values[BAR_TRANSFORM_BASELINE_ID],
});

/** 区间派生变换的中文属性面板 */
export const barTransformControls = definePreviewControls({
  presentation: 'panel',
  title: '派生区间',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'storeRevenue',
          label: '门店收入',
          views: createPlotTransformTableViews(
            { source: '原始', result: '区间派生后' },
            storeRevenue,
            barTransformOperationOf,
          ),
        },
      ],
    },
    {
      label: '变换',
      controls: [
        {
          kind: 'range',
          id: BAR_TRANSFORM_BASELINE_ID,
          label: '基线',
          defaultValue: 0,
          min: 0,
          max: 20,
          step: 2,
        },
      ],
    },
    {
      label: '布局',
      controls: [
        {
          kind: 'range',
          id: BAR_TRANSFORM_GAP_ID,
          label: '柱间距',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 区间派生基线 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: barTransformControls,
  canonicalValues: { [BAR_TRANSFORM_BASELINE_ID]: 0, [BAR_TRANSFORM_GAP_ID]: 0 },
  relatedApis: ['IntervalMark.transform', 'IntervalMark.arrangement', 'Scale.paddingInner', 'Scale.paddingOuter'],
} satisfies PreviewControlContract;
