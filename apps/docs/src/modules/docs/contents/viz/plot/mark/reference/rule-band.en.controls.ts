import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { scores } from './rule-threshold.data';

/** Stable control ids for a reference band */
export const RULE_BAND_CONTROL_IDS = {
  start: 'rule-band-start',
  end: 'rule-band-end',
} as const;

/** English panel for a reference band range */
export const ruleBandControls = definePreviewControls({
  presentation: 'panel',
  title: 'Reference band',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'scores', label: 'Score rows', rows: scores }],
    },
    {
      label: 'Range',
      controls: [
        {
          kind: 'range',
          id: RULE_BAND_CONTROL_IDS.start,
          label: 'Lower bound',
          defaultValue: 60,
          min: 40,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: RULE_BAND_CONTROL_IDS.end,
          label: 'Upper bound',
          defaultValue: 80,
          min: 70,
          max: 95,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for a reference band */
export const previewControlContract = {
  controls: ruleBandControls,
  canonicalValues: {
    [RULE_BAND_CONTROL_IDS.start]: 60,
    [RULE_BAND_CONTROL_IDS.end]: 80,
  },
  relatedApis: ['ReferenceMark.y', 'ReferenceMark.yTo'],
} satisfies PreviewControlContract;
