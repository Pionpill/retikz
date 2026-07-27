import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { waterfallRows } from './waterfall.data';

/** 自定义瀑布变换 playground 的稳定控件 id */
export const CUSTOM_TRANSFORM_CONTROL_IDS = {
  initialValue: 'custom-transform-initial-value',
} as const;

/** 自定义瀑布变换的中文属性面板 */
export const waterfallControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义变换',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-transform-waterfall-rows',
          label: '季度增减',
          rows: waterfallRows,
          columns: [
            { key: 'period', label: '季度' },
            { key: 'delta', label: '增减值' },
          ],
        },
      ],
    },
    {
      label: 'waterfall 配置',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_TRANSFORM_CONTROL_IDS.initialValue,
          label: '初始值',
          defaultValue: 60,
          min: 0,
          max: 100,
          step: 10,
        },
      ],
    },
  ],
});

/** 自定义瀑布变换 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: waterfallControls,
  canonicalValues: { [CUSTOM_TRANSFORM_CONTROL_IDS.initialValue]: 60 },
  relatedApis: ['Transform'],
} satisfies PreviewControlContract;
