import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { stackDivergingOperation } from './transform-stack-diverging.controls';
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
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Diverging stack' },
            signedProductChange,
            () => stackDivergingOperation,
          ),
          columns: [{ key: 'quarter' }, { key: 'product' }, { key: 'change' }, { key: 'y0' }, { key: 'y1' }],
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
