import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { regionSamples } from './rule-region.data';

/** Stable control ids for a two-dimensional reference region */
export const RULE_REGION_CONTROL_IDS = {
  coordinate: 'rule-region-coordinate',
  xStart: 'rule-region-x-start',
  xEnd: 'rule-region-x-end',
  yStart: 'rule-region-y-start',
  yEnd: 'rule-region-y-end',
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
      label: 'Coordinate system',
      controls: [
        {
          kind: 'select',
          id: RULE_REGION_CONTROL_IDS.coordinate,
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
    {
      label: 'Vertical range',
      controls: [
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.yStart,
          label: 'Start',
          defaultValue: 55,
          min: 20,
          max: 65,
          step: 5,
        },
        {
          kind: 'range',
          id: RULE_REGION_CONTROL_IDS.yEnd,
          label: 'End',
          defaultValue: 80,
          min: 70,
          max: 100,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for a two-dimensional reference region */
export const previewControlContract = {
  controls: ruleRegionControls,
  canonicalValues: {
    [RULE_REGION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [RULE_REGION_CONTROL_IDS.xStart]: 45,
    [RULE_REGION_CONTROL_IDS.xEnd]: 150,
    [RULE_REGION_CONTROL_IDS.yStart]: 55,
    [RULE_REGION_CONTROL_IDS.yEnd]: 80,
  },
  relatedApis: ['Plot.coordinate', 'ReferenceMark.x', 'ReferenceMark.xTo', 'ReferenceMark.y', 'ReferenceMark.yTo'],
} satisfies PreviewControlContract;
