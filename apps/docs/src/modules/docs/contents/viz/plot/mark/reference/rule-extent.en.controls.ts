import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { referenceSpans } from './rule-extent.data';

/** Stable control id for partial reference spans */
export const RULE_EXTENT_INSET_ID = 'rule-extent-inset';

/** English panel for partial reference spans */
export const ruleExtentControls = definePreviewControls({
  presentation: 'panel',
  title: 'Partial reference lines',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'referenceSpans', label: 'Reference spans', rows: referenceSpans }],
    },
    {
      label: 'Opposite-axis span',
      controls: [
        {
          kind: 'range',
          id: RULE_EXTENT_INSET_ID,
          label: 'Endpoint inset',
          defaultValue: 0,
          min: 0,
          max: 12,
          step: 3,
        },
      ],
    },
  ],
});

/** Stable documentation contract for partial reference spans */
export const previewControlContract = {
  controls: ruleExtentControls,
  canonicalValues: { [RULE_EXTENT_INSET_ID]: 0 },
  relatedApis: ['ReferenceMark.extentField', 'ReferenceMark.extentToField'],
} satisfies PreviewControlContract;
