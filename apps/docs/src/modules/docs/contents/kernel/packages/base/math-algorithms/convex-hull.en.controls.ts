import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { ConvexHullPlaygroundControlId } from './convex-hull.controls';

/** English controls for convex-hull input point sets */
export const convexHullPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Convex hull',
  sections: [
    {
      label: 'Input',
      controls: [
        {
          kind: 'select',
          id: ConvexHullPlaygroundControlId.PointSet,
          label: 'Point set',
          defaultValue: 'concave',
          options: [
            { value: 'concave', label: 'Concave boundary' },
            { value: 'duplicates', label: 'Duplicates and collinear points' },
          ],
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English convex-hull playground */
export const previewControlContract = {
  controls: convexHullPlaygroundControls,
  canonicalValues: { pointSet: 'concave' },
  presets: [
    { id: 'concave', label: 'Concave boundary', values: { pointSet: 'concave' } },
    { id: 'duplicates', label: 'Deduplicate and remove collinear points', values: { pointSet: 'duplicates' } },
  ],
  relatedApis: ['convexHull'],
} satisfies PreviewControlContract;
