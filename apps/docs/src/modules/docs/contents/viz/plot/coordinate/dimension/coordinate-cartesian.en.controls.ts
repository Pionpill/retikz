import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';

/** English controls for the Cartesian 2D coordinate example */
export const coordinateCartesianControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cartesian 2D coordinates',
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
      label: 'Coordinate guide',
      controls: [
        {
          kind: 'switch',
          id: 'showGrid',
          label: 'Show y grid',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Cartesian 2D coordinate example */
export const previewControlContract = {
  controls: coordinateCartesianControls,
  canonicalValues: {
    markType: 'point',
    showGrid: true,
  },
  relatedApis: ['PointMark', 'PathMark', 'IntervalMark', 'PlotAxis.grid'],
} satisfies PreviewControlContract;
