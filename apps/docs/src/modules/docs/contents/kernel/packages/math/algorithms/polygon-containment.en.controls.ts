import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PolygonContainmentControlId } from './polygon-containment.controls';

/** English controls for polygon shape and test points */
export const polygonContainmentControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polygons and convex hulls',
  sections: [
    {
      label: 'Input shape',
      controls: [
        {
          kind: 'select',
          id: PolygonContainmentControlId.Shape,
          label: 'Polygon',
          defaultValue: 'concave',
          options: [
            { value: 'concave', label: 'Concave polygon' },
            { value: 'convex', label: 'Convex polygon' },
          ],
        },
      ],
    },
    {
      label: 'Test points',
      controls: [
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointA,
          label: 'Point A',
          defaultValue: [0, 8],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointB,
          label: 'Point B',
          defaultValue: [150, 80],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
        {
          kind: 'point',
          id: PolygonContainmentControlId.TestPointC,
          label: 'Point C',
          defaultValue: [0, -60],
          min: [-160, -95],
          max: [160, 95],
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English polygon playground */
export const previewControlContract = {
  controls: polygonContainmentControls,
  canonicalValues: {
    shape: 'concave',
    testPointA: [0, 8],
    testPointB: [150, 80],
    testPointC: [0, -60],
  },
  relatedApis: ['polygon.containsPoint', 'convexHull'],
} satisfies PreviewControlContract;
