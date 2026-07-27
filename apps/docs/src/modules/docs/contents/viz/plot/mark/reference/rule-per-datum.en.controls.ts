import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { thresholds } from './rule-per-datum.data';

/** Stable control id for per-datum threshold offsets */
export const RULE_PER_DATUM_OFFSET_ID = 'rule-per-datum-offset';

/** English panel for per-datum thresholds */
export const rulePerDatumControls = definePreviewControls({
  presentation: 'panel',
  title: 'Per-row thresholds',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'thresholds', label: 'Per-row thresholds', rows: thresholds }],
    },
    {
      label: 'Data derivation',
      controls: [
        {
          kind: 'range',
          id: RULE_PER_DATUM_OFFSET_ID,
          label: 'Global offset',
          defaultValue: 0,
          min: -15,
          max: 15,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for per-datum threshold offsets */
export const previewControlContract = {
  controls: rulePerDatumControls,
  canonicalValues: { [RULE_PER_DATUM_OFFSET_ID]: 0 },
  relatedApis: ['ReferenceMark.y', 'ReferenceMark.color'],
} satisfies PreviewControlContract;
