import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { allInvalidRows, cleanRows, dirtyRows } from './validation-policy.data';

/** 数据校验策略的中文控件 */
export const validationPolicyControls = definePreviewControls({
  presentation: 'panel',
  title: '校验策略',
  sections: [
    {
      label: '输入数据',
      controls: [
        {
          kind: 'table',
          id: 'cleanRows',
          label: '全部有效',
          rows: cleanRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['clean'] },
        },
        {
          kind: 'table',
          id: 'dirtyRows',
          label: '少量坏值',
          rows: dirtyRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['dirty'] },
        },
        {
          kind: 'table',
          id: 'allInvalidRows',
          label: '目标字段全坏',
          rows: allInvalidRows,
          visibleWhen: { controlId: 'dataset', oneOf: ['allInvalid'] },
        },
      ],
    },
    {
      label: '校验',
      controls: [
        {
          kind: 'select',
          id: 'dataset',
          label: '数据场景',
          defaultValue: 'dirty',
          options: [
            { value: 'clean', label: '全部有效' },
            { value: 'dirty', label: '少量坏值' },
            { value: 'allInvalid', label: '目标字段全坏' },
          ],
        },
        {
          kind: 'select',
          id: 'policy',
          label: '策略',
          defaultValue: 'skip',
          options: [
            { value: 'skip', label: '跳过非法值' },
            { value: 'sample', label: '抽样诊断' },
            { value: 'error', label: '遇错即停' },
          ],
        },
      ],
    },
  ],
});

/** 数据校验策略的稳定文档契约 */
export const previewControlContract = {
  controls: validationPolicyControls,
  canonicalValues: { dataset: 'dirty', policy: 'skip' },
  presets: [
    { id: 'skip-dirty', label: '坏值继续绘图', values: { dataset: 'dirty', policy: 'skip' } },
    { id: 'sample-empty', label: '全坏字段诊断', values: { dataset: 'allInvalid', policy: 'sample' } },
    { id: 'strict-dirty', label: '首个坏值报错', values: { dataset: 'dirty', policy: 'error' } },
  ],
  relatedApis: ['Plot.validateData', 'Plot.invalid'],
} satisfies PreviewControlContract;
