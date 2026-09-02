import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { waterfallRows } from './waterfall.data';
import { waterfallTransform } from './waterfall.definition';

/** 自定义瀑布变换 playground 的稳定控件 id */
export const CUSTOM_TRANSFORM_CONTROL_IDS = {
  initialValue: 'custom-transform-initial-value',
} as const;

/** 根据实时控件值创建自定义 waterfall operation */
export const waterfallOperationOf = (values: { [CUSTOM_TRANSFORM_CONTROL_IDS.initialValue]: number }) => ({
  kind: 'waterfall',
  field: 'delta',
  initialValue: values[CUSTOM_TRANSFORM_CONTROL_IDS.initialValue],
});

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
          views: createPlotTransformTableViews(
            { source: '原始', result: '瀑布变换后' },
            waterfallRows,
            waterfallOperationOf,
            { transformDefinitions: [waterfallTransform] },
          ),
          columns: [{ key: 'period' }, { key: 'delta' }, { key: 'from' }, { key: 'to' }, { key: 'direction' }],
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
