import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';

/** English controls for the polar 2D coordinate example */
export const coordinatePolarControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polar 2D coordinates',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Category values',
          rows: coordinate2DRows,
          columns: [
            { key: 'category', label: 'Category' },
            { key: 'value', label: 'Value' },
          ],
        },
      ],
    },
    {
      label: 'Mark',
      controls: [
        {
          kind: 'select',
          id: 'markType',
          label: 'Mark type',
          defaultValue: 'point',
          options: [
            { value: 'point', label: 'Point' },
            { value: 'line', label: 'Line' },
            { value: 'interval', label: 'Area' },
          ],
        },
      ],
    },
    {
      label: 'Coordinate projection',
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
          defaultValue: -90,
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

/** Stable documentation contract for the polar 2D coordinate example */
export const previewControlContract = {
  controls: coordinatePolarControls,
  canonicalValues: {
    markType: 'point',
    innerRadius: 0,
    startAngle: -90,
    sweepAngle: 360,
  },
  relatedApis: ['PointMark', 'PathMark', 'IntervalMark', 'Plot.coordinate'],
} satisfies PreviewControlContract;
