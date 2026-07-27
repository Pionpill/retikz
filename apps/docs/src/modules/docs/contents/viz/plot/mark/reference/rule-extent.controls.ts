import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { referenceSpans } from './rule-extent.data';

/** 局部参考线 playground 的稳定控件 id */
export const RULE_EXTENT_INSET_ID = 'rule-extent-inset';

/** 局部参考线的中文属性面板 */
export const ruleExtentControls = definePreviewControls({
  presentation: 'panel',
  title: '局部参考线',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'referenceSpans', label: '参考范围', rows: referenceSpans }],
    },
    {
      label: '对侧范围',
      controls: [
        {
          kind: 'range',
          id: RULE_EXTENT_INSET_ID,
          label: '端点内缩',
          defaultValue: 0,
          min: 0,
          max: 12,
          step: 3,
        },
      ],
    },
  ],
});

/** 局部参考线 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleExtentControls,
  canonicalValues: { [RULE_EXTENT_INSET_ID]: 0 },
  relatedApis: ['ReferenceMark.extentField', 'ReferenceMark.extentToField'],
} satisfies PreviewControlContract;
