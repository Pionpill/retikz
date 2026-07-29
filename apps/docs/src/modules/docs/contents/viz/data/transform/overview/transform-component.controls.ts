import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { regionalOrders } from './transform-component.data';
import { transformComponentOperationsOf } from './transform-component-preview';

/** Transform 声明顺序示例的中文控件 */
export const transformComponentControls = definePreviewControls({
  presentation: 'panel',
  title: '变换输入',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '订单明细',
          views: createTransformTableViews(
            { source: '原始', result: '变换' },
            regionalOrders,
            transformComponentOperationsOf,
          ),
        },
      ],
    },
  ],
});

/** Transform 声明顺序示例的稳定文档契约 */
export const previewControlContract = {
  controls: transformComponentControls,
  canonicalValues: {},
  relatedApis: [],
} satisfies PreviewControlContract;
