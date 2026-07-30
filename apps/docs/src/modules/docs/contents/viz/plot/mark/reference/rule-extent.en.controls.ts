import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { referenceSpans } from './rule-extent.data';

/** Stable control id for partial reference spans */
export const RULE_EXTENT_INSET_ID = 'rule-extent-inset';

/** Stable coordinate control id for partial reference spans */
export const RULE_EXTENT_COORDINATE_ID = 'rule-extent-coordinate';

/** English panel for partial reference spans */
export const ruleExtentControls = definePreviewControls({
  presentation: 'panel',
  title: 'Partial reference lines',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'referenceSpans', label: 'Reference spans', rows: referenceSpans }],
    },
    {
      label: 'Coordinate system',
      controls: [
        {
          kind: 'select',
          id: RULE_EXTENT_COORDINATE_ID,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
      ],
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
  canonicalValues: {
    [RULE_EXTENT_COORDINATE_ID]: 'cartesian2D',
    [RULE_EXTENT_INSET_ID]: 0,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.extentField', 'ReferenceMark.extentToField'],
} satisfies PreviewControlContract;
