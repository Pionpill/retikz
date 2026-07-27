import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { signedProductChange } from './transform-stack-diverging.data';

/** 正负分流堆叠示例的英文只读数据面板 */
export const stackDivergingControls = definePreviewControls({
  presentation: 'panel',
  title: 'Diverging stack',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Quarterly product changes',
          rows: signedProductChange,
          columns: [
            { key: 'quarter', label: 'Quarter' },
            { key: 'product', label: 'Product' },
            { key: 'change', label: 'Change' },
          ],
        },
      ],
    },
  ],
});

/** 正负分流堆叠示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: stackDivergingControls,
  canonicalValues: {},
  relatedApis: ['IRPlotStackTransform.offset'],
} satisfies PreviewControlContract;
