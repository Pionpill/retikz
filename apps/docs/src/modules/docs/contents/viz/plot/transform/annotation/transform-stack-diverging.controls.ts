import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { signedProductChange } from './transform-stack-diverging.data';

/** 正负分流堆叠 operation */
export const stackDivergingOperation = {
  kind: 'stack',
  x: 'quarter',
  y: 'change',
  groupBy: 'product',
  offset: 'diverging',
} as const;

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
          views: createPlotTransformTableViews(
            { source: '原始', result: '正负分流堆叠后' },
            signedProductChange,
            () => stackDivergingOperation,
          ),
          columns: [{ key: 'quarter' }, { key: 'product' }, { key: 'change' }, { key: 'y0' }, { key: 'y1' }],
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
