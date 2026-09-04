import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { stackOperationOf } from './transform-stack.controls';
import { productRevenue } from './transform-stack.data';

/** 堆叠示例的英文控件 */
export const stackControls = definePreviewControls({
  presentation: 'panel',
  title: 'Stack intervals',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Quarterly product revenue',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Stacked' },
            productRevenue,
            stackOperationOf,
          ),
          columns: [{ key: 'quarter' }, { key: 'product' }, { key: 'revenue' }, { key: 'y0' }, { key: 'y1' }],
        },
      ],
    },
    {
      label: 'Stack layout',
      controls: [
        {
          kind: 'select',
          id: 'offset',
          label: 'Baseline strategy',
          defaultValue: 'zero',
          options: [
            { value: 'zero', label: 'Accumulate from zero' },
            { value: 'normalize', label: 'Normalize to 0–1' },
            { value: 'center', label: 'Center the stack' },
            { value: 'overlap', label: 'Overlap from zero' },
          ],
        },
      ],
    },
  ],
});

/** 堆叠示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: stackControls,
  canonicalValues: { offset: 'zero' },
  presets: [
    { id: 'zero', label: 'Standard stack', values: { offset: 'zero' } },
    { id: 'normalize', label: 'Normalized stack', values: { offset: 'normalize' } },
    { id: 'center', label: 'Centered stack', values: { offset: 'center' } },
  ],
  relatedApis: ['IRPlotStackTransform.offset'],
} satisfies PreviewControlContract;
