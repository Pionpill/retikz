import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { INTERVAL_SECTOR_CONTROL_IDS } from './interval-sector.controls';
import { traffic } from './interval-sector.data';

/** English panel for polar sectors */
export const intervalSectorControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polar sectors',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'traffic', label: 'Traffic sources', rows: traffic }],
    },
    {
      label: 'Sector',
      controls: [
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.innerRadius,
          label: 'Inner radius',
          defaultValue: 0.55,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.padAngle,
          label: 'Sector gap',
          defaultValue: 2,
          min: 0,
          max: 10,
          step: 1,
        },
        {
          kind: 'range',
          id: INTERVAL_SECTOR_CONTROL_IDS.pullDistance,
          label: 'Search pull distance',
          defaultValue: 0,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'switch',
          id: INTERVAL_SECTOR_CONTROL_IDS.showLabels,
          label: 'Show labels',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for polar sectors */
export const previewControlContract = {
  controls: intervalSectorControls,
  canonicalValues: {
    [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
    [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
    [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
    [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
  },
  presets: [
    {
      id: 'pie',
      label: 'Pie',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: false,
      },
    },
    {
      id: 'donut',
      label: 'Donut',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 0,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
      },
    },
    {
      id: 'exploded',
      label: 'Exploded sector',
      values: {
        [INTERVAL_SECTOR_CONTROL_IDS.innerRadius]: 0.55,
        [INTERVAL_SECTOR_CONTROL_IDS.padAngle]: 2,
        [INTERVAL_SECTOR_CONTROL_IDS.pullDistance]: 18,
        [INTERVAL_SECTOR_CONTROL_IDS.showLabels]: true,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'IntervalMark.angle',
    'IntervalMark.padAngle',
    'IntervalMark.pull',
    'IntervalMark.label',
  ],
} satisfies PreviewControlContract;
