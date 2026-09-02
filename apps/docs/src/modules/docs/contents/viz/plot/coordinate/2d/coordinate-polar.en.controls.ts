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
          columns: [{ key: 'category' }, { key: 'value' }],
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
          defaultValue: 'line',
          options: [
            { value: 'point', label: 'Point' },
            { value: 'line', label: 'Line' },
            { value: 'interval', label: 'Area' },
          ],
        },
        {
          kind: 'select',
          id: 'markInterpolation',
          label: 'Mark interpolation',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: 'Inherit coordinate' },
            { value: 'polar', label: 'Polar curve' },
            { value: 'chord', label: 'Straight chord' },
          ],
          visibleWhen: { controlId: 'markType', oneOf: ['line', 'interval'] },
        },
      ],
    },
    {
      label: 'Coordinate projection',
      controls: [
        {
          kind: 'select',
          id: 'coordinateInterpolation',
          label: 'Coordinate interpolation',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Auto inference' },
            { value: 'polar', label: 'Polar curve' },
            { value: 'chord', label: 'Straight chord' },
          ],
        },
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
    markType: 'line',
    markInterpolation: 'inherit',
    coordinateInterpolation: 'auto',
    innerRadius: 0,
    startAngle: -90,
    sweepAngle: 360,
  },
  relatedApis: ['PointMark', 'PathMark.interpolation', 'IntervalMark.interpolation', 'Plot.coordinate.interpolation'],
} satisfies PreviewControlContract;
