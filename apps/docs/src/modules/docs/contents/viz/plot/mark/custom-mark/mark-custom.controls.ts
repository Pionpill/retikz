import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { glyphRows } from './mark-custom.data';

/** 自定义图元 playground 的稳定控件 id */
export const CUSTOM_MARK_CONTROL_IDS = {
  size: 'custom-mark-size',
  fill: 'custom-mark-fill',
} as const;

/** 自定义图元的中文属性面板 */
export const customMarkControls = definePreviewControls({
  presentation: 'panel',
  title: '自定义图元',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-mark-rows',
          label: '月度销售额',
          rows: glyphRows,
          columns: [{ key: 'month' }, { key: 'sales' }],
        },
      ],
    },
    {
      label: 'diamond 配置',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_MARK_CONTROL_IDS.size,
          label: '最小尺寸',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 2,
        },
        {
          kind: 'color',
          id: CUSTOM_MARK_CONTROL_IDS.fill,
          label: '填充颜色',
          defaultValue: '#f59e0b',
        },
      ],
    },
  ],
});

/** 自定义图元 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: customMarkControls,
  canonicalValues: {
    [CUSTOM_MARK_CONTROL_IDS.size]: 16,
    [CUSTOM_MARK_CONTROL_IDS.fill]: '#f59e0b',
  },
  relatedApis: ['Plot.spec'],
} satisfies PreviewControlContract;
