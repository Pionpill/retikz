import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { signedProductChange } from './transform-stack-diverging.data';

/** 正负分流堆叠示例的中文只读数据面板 */
export const stackDivergingControls = definePreviewControls({
  presentation: 'panel',
  title: '正负分流堆叠',
  sections: [
    {
      label: '数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '季度产品变化',
          rows: signedProductChange,
          columns: [
            { key: 'quarter', label: '季度' },
            { key: 'product', label: '产品' },
            { key: 'change', label: '变化' },
          ],
        },
      ],
    },
  ],
});

/** 正负分流堆叠示例的稳定文档契约 */
export const previewControlContract = {
  controls: stackDivergingControls,
  canonicalValues: {},
  relatedApis: ['IRPlotStackTransform.offset'],
} satisfies PreviewControlContract;
