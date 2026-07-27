import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { regionSamples } from './rule-region.data';

/** Stable control ids for a two-dimensional reference region */
export const RULE_REGION_CONTROL_IDS = {
  xStart: 'rule-region-x-start',
  xEnd: 'rule-region-x-end',
} as const;

/** English panel for a two-dimensional reference region */
export const ruleRegionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Reference region',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'regionSamples', label: 'Sample points', rows: regionSamples }],
    },
    {
      label: 'Horizontal range',
      controls: [
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.xStart,
          label: 'Start',
          defaultValue: 45,
          min: 0,
          max: 120,
          step: 15,
        },
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.xEnd,
          label: 'End',
          defaultValue: 150,
          min: 135,
          max: 330,
          step: 15,
        },
      ],
    },
  ],
});

/** Stable documentation contract for a two-dimensional reference region */
export const previewControlContract = {
  controls: ruleRegionControls,
  canonicalValues: {
    [RULE_REGION_CONTROL_IDS.xStart]: 45,
    [RULE_REGION_CONTROL_IDS.xEnd]: 150,
  },
  relatedApis: ['ReferenceMark.x', 'ReferenceMark.xTo'],
} satisfies PreviewControlContract;
