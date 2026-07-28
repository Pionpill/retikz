import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sizeSales } from './data-model-order.data';

/** 分类顺序示例的中文控件 */
export const dataModelOrderControls = definePreviewControls({
  presentation: 'panel',
  title: '分类顺序',
  sections: [
    {
      label: '输入数据',
      controls: [{ kind: 'table', id: 'rows', label: '原始行', rows: sizeSales }],
    },
    {
      label: '分类域',
      controls: [
        {
          kind: 'select',
          id: 'orderMode',
          label: '顺序',
          defaultValue: 'appearance',
          options: [
            { value: 'appearance', label: '数据出现顺序' },
            { value: 'ascending', label: '升序' },
            { value: 'descending', label: '降序' },
            { value: 'business', label: '业务顺序 S → XL' },
          ],
        },
      ],
    },
  ],
});

/** 分类顺序示例的稳定文档契约 */
export const previewControlContract = {
  controls: dataModelOrderControls,
  canonicalValues: { orderMode: 'appearance' },
  presets: [
    { id: 'appearance', label: '出现顺序', values: { orderMode: 'appearance' } },
    { id: 'business', label: '业务顺序', values: { orderMode: 'business' } },
  ],
  relatedApis: ['IRDataFieldDefinition.order'],
} satisfies PreviewControlContract;
