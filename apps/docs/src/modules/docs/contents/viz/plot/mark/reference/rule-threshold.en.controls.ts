import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** Stable control id for a fixed threshold */
export const RULE_THRESHOLD_VALUE_ID = 'rule-threshold-value';

/** English panel for a fixed threshold */
export const ruleThresholdControls = definePreviewControls({
  presentation: 'panel',
  title: 'Fixed threshold',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scores', label: 'Score rows', rows: scores }],
    },
    {
      label: 'Reference line',
      controls: [
        {
          kind: 'range',
          id: RULE_THRESHOLD_VALUE_ID,
          label: 'Threshold',
          defaultValue: 60,
          min: 40,
          max: 90,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for a fixed threshold */
export const previewControlContract = {
  controls: ruleThresholdControls,
  canonicalValues: { [RULE_THRESHOLD_VALUE_ID]: 60 },
  relatedApis: ['ReferenceMark.y'],
} satisfies PreviewControlContract;
