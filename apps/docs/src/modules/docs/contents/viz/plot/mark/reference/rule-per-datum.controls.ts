import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { thresholds } from './rule-per-datum.data';

/** 逐数据阈值偏移 playground 的稳定控件 id */
export const RULE_PER_DATUM_OFFSET_ID = 'rule-per-datum-offset';

/** 逐数据阈值的中文属性面板 */
export const rulePerDatumControls = definePreviewControls({
  presentation: 'panel',
  title: '逐行阈值',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'thresholds', label: '逐行阈值', rows: thresholds }],
    },
    {
      label: '数据派生',
      controls: [
        {
          kind: 'range',
          id: RULE_PER_DATUM_OFFSET_ID,
          label: '整体偏移',
          defaultValue: 0,
          min: -15,
          max: 15,
          step: 5,
        },
      ],
    },
  ],
});

/** 逐数据阈值偏移 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: rulePerDatumControls,
  canonicalValues: { [RULE_PER_DATUM_OFFSET_ID]: 0 },
  relatedApis: ['ReferenceMark.y', 'ReferenceMark.color'],
} satisfies PreviewControlContract;
