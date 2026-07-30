import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformTableViews } from '@/modules/docs/preview';

import { cityRevenue } from './transform-select.data';
import { transformSelectOperationOf } from './transform-select-preview';

/** 代表行选择示例的中文控件 */
export const transformSelectControls = definePreviewControls({
  presentation: 'panel',
  title: '代表行选择',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '城市收入',
          views: createTransformTableViews({ source: '原始', result: '变换' }, cityRevenue, transformSelectOperationOf),
        },
      ],
    },
    {
      label: '选择规则',
      controls: [
        {
          kind: 'select',
          id: 'selectorKind',
          label: '类型',
          defaultValue: 'max',
          options: [
            { value: 'max', label: '最大值' },
            { value: 'min', label: '最小值' },
            { value: 'top', label: '前 N 名' },
            { value: 'bottom', label: '后 N 名' },
          ],
        },
        {
          kind: 'range',
          id: 'n',
          label: '行数',
          defaultValue: 1,
          min: 1,
          max: 3,
          step: 1,
          visibleWhen: { controlId: 'selectorKind', oneOf: ['top', 'bottom'] },
        },
        {
          kind: 'select',
          id: 'tie',
          label: '平局处理',
          defaultValue: 'first',
          options: [
            { value: 'first', label: '保留首行' },
            { value: 'last', label: '保留尾行' },
            { value: 'all', label: '保留全部' },
          ],
        },
      ],
    },
  ],
});

/** 代表行选择示例的稳定文档契约 */
export const previewControlContract = {
  controls: transformSelectControls,
  canonicalValues: { selectorKind: 'max', n: 1, tie: 'first' },
  presets: [
    { id: 'max', label: '组内最大', values: { selectorKind: 'max', n: 1, tie: 'first' } },
    { id: 'min', label: '组内最小', values: { selectorKind: 'min', n: 1, tie: 'first' } },
    { id: 'top-two', label: '组内前 2 名', values: { selectorKind: 'top', n: 2, tie: 'all' } },
  ],
  relatedApis: ['IRDataSelectTransform.selector', 'IRDataSelectTransform.rankAs'],
} satisfies PreviewControlContract;
