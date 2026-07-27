import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { weeklyPipeline } from './line-transform.data';

/** 路径层趋势分组 playground 的稳定控件 id */
export const LINE_TRANSFORM_GROUPING_ID = 'line-transform-grouping';

/** 路径层局部变换的中文属性面板 */
export const lineTransformControls = definePreviewControls({
  presentation: 'panel',
  title: '路径层趋势',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'weeklyPipeline', label: '周度流水', rows: weeklyPipeline }],
    },
    {
      label: '拟合',
      controls: [
        {
          kind: 'select',
          id: LINE_TRANSFORM_GROUPING_ID,
          label: '拟合方式',
          defaultValue: 'overall',
          options: [
            { value: 'overall', label: '整体趋势' },
            { value: 'channel', label: '按渠道拟合' },
          ],
        },
      ],
    },
  ],
});

/** 平滑变换 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineTransformControls,
  canonicalValues: { [LINE_TRANSFORM_GROUPING_ID]: 'overall' },
  relatedApis: ['PathMark.transform', 'IRPlotSmoothTransform.groupBy', 'PathMark.series'],
} satisfies PreviewControlContract;
