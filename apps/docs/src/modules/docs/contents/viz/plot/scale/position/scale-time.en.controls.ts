import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { visits } from './scale-time.data';

/** 时间位置比例尺示例的英文数据面板 */
export const scaleTimeControls = definePreviewControls({
  presentation: 'panel',
  title: 'Automatic time-scale derivation',
  sections: [
    {
      label: 'Temporal field and data',
      controls: [
        {
          kind: 'table',
          id: 'visits',
          label: 'Quarterly visits',
          rows: visits,
          columns: [{ key: 'date' }, { key: 'value' }],
        },
      ],
    },
  ],
});

/** 时间位置比例尺示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: scaleTimeControls,
  canonicalValues: {},
  relatedApis: ['Plot.model'],
} satisfies PreviewControlContract;
