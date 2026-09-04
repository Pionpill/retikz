import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { visits } from './scale-time.data';

/** 时间位置比例尺示例的中文数据面板 */
export const scaleTimeControls = definePreviewControls({
  presentation: 'panel',
  title: '时间比例尺自动派生',
  sections: [
    {
      label: '时间字段与数据',
      controls: [
        {
          kind: 'table',
          id: 'visits',
          label: '季度访问量',
          rows: visits,
          columns: [{ key: 'date' }, { key: 'value' }],
        },
      ],
    },
  ],
});

/** 时间位置比例尺示例的稳定文档契约 */
export const previewControlContract = {
  controls: scaleTimeControls,
  canonicalValues: {},
  relatedApis: ['Plot.model'],
} satisfies PreviewControlContract;
