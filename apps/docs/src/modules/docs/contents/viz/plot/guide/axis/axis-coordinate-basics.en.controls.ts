import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { axisCoordinateBasicsRows } from './axis-coordinate-basics.data';

/** English controls for the coordinate-system basics example */
export const axisCoordinateBasicsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Coordinate system and axis roles',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Dimension values',
          rows: axisCoordinateBasicsRows,
          columns: [
            { key: 'dimension', label: 'Dimension' },
            { key: 'value', label: 'Value' },
            { key: 'order', label: 'Order' },
          ],
        },
      ],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: 'coordinate',
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
      label: 'Axes',
      controls: [
        { kind: 'switch', id: 'showX', label: 'Show x / angular axis', defaultValue: true },
        { kind: 'switch', id: 'showY', label: 'Show y / radial axis', defaultValue: true },
        {
          kind: 'switch',
          id: 'showGrid',
          label: 'Show y / radial grid',
          defaultValue: true,
          visibleWhen: { controlId: 'showY', oneOf: [true] },
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: 'Target y / radial tick count',
          defaultValue: 5,
          min: 2,
          max: 8,
          step: 1,
          visibleWhen: { controlId: 'showY', oneOf: [true] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the coordinate-system basics example */
export const previewControlContract = {
  controls: axisCoordinateBasicsControls,
  canonicalValues: {
    coordinate: 'cartesian2D',
    showX: true,
    showY: true,
    showGrid: true,
    tickCount: 5,
  },
  relatedApis: ['Plot.coordinate', 'Axis.dimension', 'Axis.grid', 'Axis.ticks'],
} satisfies PreviewControlContract;
