import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** Stable control id for a fixed threshold */
export const RULE_THRESHOLD_VALUE_ID = 'rule-threshold-value';

/** Stable coordinate control id for a fixed threshold */
export const RULE_THRESHOLD_COORDINATE_ID = 'rule-threshold-coordinate';

/** Stable reference-axis control id for a fixed threshold */
export const RULE_THRESHOLD_AXIS_ID = 'rule-threshold-axis';

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
      label: 'Coordinate system',
      controls: [
        {
          kind: 'select',
          id: RULE_THRESHOLD_COORDINATE_ID,
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
      label: 'Reference line',
      controls: [
        {
          kind: 'select',
          id: RULE_THRESHOLD_AXIS_ID,
          label: 'Reference axis',
          defaultValue: 'y',
          options: [
            { value: 'y', label: 'y: horizontal line / ring' },
            { value: 'x', label: 'x: vertical / radial line' },
          ],
        },
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
  canonicalValues: {
    [RULE_THRESHOLD_COORDINATE_ID]: 'cartesian2D',
    [RULE_THRESHOLD_AXIS_ID]: 'y',
    [RULE_THRESHOLD_VALUE_ID]: 60,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.x', 'ReferenceMark.y'],
} satisfies PreviewControlContract;
