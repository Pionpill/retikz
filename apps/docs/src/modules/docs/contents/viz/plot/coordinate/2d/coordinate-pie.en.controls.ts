import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { share } from './coordinate-pie.data';

/** English controls for the pie and donut example */
export const coordinatePieControls = definePreviewControls({
  presentation: 'panel',
  title: 'Sector chart',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Category share',
          rows: share,
          columns: [
            { key: 'label', label: 'Category' },
            { key: 'value', label: 'Value' },
          ],
        },
      ],
    },
    {
      label: 'Ring',
      controls: [
        {
          kind: 'range',
          id: 'innerRadius',
          label: 'Inner radius',
          defaultValue: 0,
          min: 0,
          max: 0.75,
          step: 0.05,
        },
        {
          kind: 'range',
          id: 'startAngle',
          label: 'Start angle',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
        },
        {
          kind: 'range',
          id: 'sweepAngle',
          label: 'Sweep angle',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the pie and donut example */
export const previewControlContract = {
  controls: coordinatePieControls,
  canonicalValues: {
    innerRadius: 0,
    startAngle: 0,
    sweepAngle: 360,
  },
  presets: [
    { id: 'pie', label: 'Pie', values: { innerRadius: 0, startAngle: 0, sweepAngle: 360 } },
    { id: 'donut', label: 'Donut', values: { innerRadius: 0.55, startAngle: 0, sweepAngle: 360 } },
    { id: 'semicircle', label: 'Semicircle', values: { innerRadius: 0.45, startAngle: 180, sweepAngle: 180 } },
  ],
  relatedApis: ['Plot.coordinate', 'IntervalMark.angle'],
} satisfies PreviewControlContract;
