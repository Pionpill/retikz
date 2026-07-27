import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './line-series.data';

/** 路径系列 playground 的稳定控件 id */
export const LINE_SERIES_CONTROL_ID = 'line-series-field';

/** 路径系列的中文属性面板 */
export const lineSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: '路径系列',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'climate', label: '城市气候', rows: climate }],
    },
    {
      label: '分组',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_ID,
          label: 'series 字段',
          defaultValue: 'city',
          options: [
            { value: 'city', label: 'city' },
            { value: 'none', label: '不分系列' },
          ],
        },
      ],
    },
  ],
});

/** 路径系列 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineSeriesControls,
  canonicalValues: { [LINE_SERIES_CONTROL_ID]: 'city' },
  relatedApis: ['PathMark.series', 'PathMark.order'],
} satisfies PreviewControlContract;
