import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PolygonClipControlId } from './polygon-clip.controls';

/** English controls for the polygon clip example */
export const polygonClipControls = definePreviewControls({
  presentation: 'panel',
  title: 'Polygon clip',
  sections: [
    {
      label: 'Vertex coordinates',
      controls: [
        {
          kind: 'point',
          id: PolygonClipControlId.Top,
          label: 'Top vertex',
          defaultValue: [100, 24],
          min: [70, 10],
          max: [130, 60],
          step: 2,
        },
        {
          kind: 'point',
          id: PolygonClipControlId.Right,
          label: 'Bottom-right vertex',
          defaultValue: [180, 164],
          min: [140, 120],
          max: [190, 184],
          step: 2,
        },
        {
          kind: 'point',
          id: PolygonClipControlId.Left,
          label: 'Bottom-left vertex',
          defaultValue: [20, 164],
          min: [10, 120],
          max: [60, 184],
          step: 2,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the polygon clip example */
export const previewControlContract = {
  controls: polygonClipControls,
  canonicalValues: {
    top: [100, 24],
    right: [180, 164],
    left: [20, 164],
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRPolygonClip.points'],
} satisfies PreviewControlContract;
