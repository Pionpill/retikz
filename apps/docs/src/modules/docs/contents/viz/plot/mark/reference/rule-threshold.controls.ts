import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** 固定阈值 playground 的稳定控件 id */
export const RULE_THRESHOLD_VALUE_ID = 'rule-threshold-value';

/** 固定阈值的中文属性面板 */
export const ruleThresholdControls = definePreviewControls({
  presentation: 'panel',
  title: '固定阈值',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scores', label: '成绩数据', rows: scores }],
    },
    {
      label: '参考线',
      controls: [
        {
          kind: 'range',
          id: RULE_THRESHOLD_VALUE_ID,
          label: '阈值',
          defaultValue: 60,
          min: 40,
          max: 90,
          step: 5,
        },
      ],
    },
  ],
});

/** 固定阈值 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: ruleThresholdControls,
  canonicalValues: { [RULE_THRESHOLD_VALUE_ID]: 60 },
  relatedApis: ['ReferenceMark.y'],
} satisfies PreviewControlContract;
