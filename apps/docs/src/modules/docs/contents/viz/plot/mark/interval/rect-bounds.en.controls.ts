import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { matrix } from './rect-heatmap.data';

/** Stable control id for rectangle bounds */
export const RECT_BOUNDS_MODE_ID = 'rect-bounds-mode';
export const RECT_BOUNDS_SHOW_COLOR_ID = 'rect-bounds-show-color';
export const RECT_BOUNDS_COORDINATE_ID = 'interval-cell-coordinate';

/** English panel for rectangle bound sources */
export const rectBoundsControls = definePreviewControls({
  presentation: 'panel',
  title: '2D cells',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'matrix', label: 'Heatmap matrix', rows: matrix }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: RECT_BOUNDS_COORDINATE_ID,
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
      label: 'Bound source',
      controls: [
        {
          kind: 'select',
          id: RECT_BOUNDS_MODE_ID,
          label: 'y bound',
          defaultValue: 'band',
          options: [
            { value: 'band', label: 'Category band' },
            { value: 'full', label: 'Full range' },
          ],
        },
        {
          kind: 'switch',
          id: RECT_BOUNDS_SHOW_COLOR_ID,
          label: 'Map color',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for rectangle bounds */
export const previewControlContract = {
  controls: rectBoundsControls,
  canonicalValues: {
    [RECT_BOUNDS_COORDINATE_ID]: 'cartesian2D',
    [RECT_BOUNDS_MODE_ID]: 'band',
    [RECT_BOUNDS_SHOW_COLOR_ID]: true,
  },
  relatedApis: ['Plot.coordinate', 'IntervalMark.bounds', 'IntervalMark.color'],
} satisfies PreviewControlContract;
