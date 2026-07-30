import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { thresholds } from './rule-per-datum.data';

/** Stable control id for per-datum threshold offsets */
export const RULE_PER_DATUM_OFFSET_ID = 'rule-per-datum-offset';

/** Stable coordinate control id for per-datum thresholds */
export const RULE_PER_DATUM_COORDINATE_ID = 'rule-per-datum-coordinate';

/** English panel for per-datum thresholds */
export const rulePerDatumControls = definePreviewControls({
  presentation: 'panel',
  title: 'Per-row thresholds',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'thresholds', label: 'Per-row thresholds', rows: thresholds }],
    },
    {
      label: 'Coordinate system',
      controls: [
        {
          kind: 'select',
          id: RULE_PER_DATUM_COORDINATE_ID,
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
  canonicalValues: {
    [RULE_PER_DATUM_COORDINATE_ID]: 'cartesian2D',
    [RULE_PER_DATUM_OFFSET_ID]: 0,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.y', 'ReferenceMark.color'],
} satisfies PreviewControlContract;
