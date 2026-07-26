import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { channelTrend } from './line-series.data';

/** 颜色隐式拆分 playground 的稳定控件 id */
export const LINE_COLOR_CONTROL_ID = 'line-color-field';

/** 颜色隐式拆分的中文属性面板 */
export const lineColorSplitControls = definePreviewControls({
  presentation: 'panel',
  title: '颜色拆分',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'channelTrend', label: '分类趋势', rows: channelTrend }],
    },
    {
      label: '颜色通道',
      controls: [
        {
          kind: 'select',
          id: LINE_COLOR_CONTROL_ID,
          label: 'color 字段',
          defaultValue: 'channel',
          options: [
            { value: 'channel', label: 'channel' },
            { value: 'none', label: '不按颜色拆分' },
          ],
        },
      ],
    },
  ],
});

/** 颜色隐式拆分 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineColorSplitControls,
  canonicalValues: { [LINE_COLOR_CONTROL_ID]: 'channel' },
  relatedApis: ['PathMark.color', 'PathMark.order'],
} satisfies PreviewControlContract;
