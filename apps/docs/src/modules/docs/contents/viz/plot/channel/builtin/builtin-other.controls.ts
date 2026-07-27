import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { otherRows } from './builtin-other.data';

/** 其他通道示例的中文数据面板 */
export const builtinOtherControls = definePreviewControls({
  presentation: 'panel',
  title: '其他通道',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '系列数据',
          rows: otherRows,
          columns: [
            { key: 'step', label: '步骤' },
            { key: 'value', label: '数值' },
            { key: 'series', label: '系列' },
          ],
        },
      ],
    },
  ],
});

/** 其他通道示例的稳定文档契约 */
export const previewControlContract = {
  controls: builtinOtherControls,
  canonicalValues: {},
  relatedApis: ['PathMark.order', 'PathMark.series'],
} satisfies PreviewControlContract;
