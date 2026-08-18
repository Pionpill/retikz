import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CircleEllipseClipControlId } from './circle-ellipse-clip.controls';

/** English controls for the circle and ellipse clip example */
export const circleEllipseClipControls = definePreviewControls({
  presentation: 'panel',
  title: 'Circle / ellipse',
  sections: [
    {
      label: 'Circle parameters',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseClipControlId.CircleRadius,
          label: 'Radius',
          defaultValue: 48,
          min: 28,
          max: 66,
          step: 2,
        },
      ],
    },
    {
      label: 'Ellipse parameters',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseClipControlId.EllipseRadiusX,
          label: 'Horizontal radius',
          defaultValue: 62,
          min: 34,
          max: 76,
          step: 2,
        },
        {
          kind: 'range',
          id: CircleEllipseClipControlId.EllipseRadiusY,
          label: 'Vertical radius',
          defaultValue: 42,
          min: 24,
          max: 62,
          step: 2,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the circle and ellipse clip example */
export const previewControlContract = {
  controls: circleEllipseClipControls,
  canonicalValues: {
    circleRadius: 48,
    ellipseRadiusX: 62,
    ellipseRadiusY: 42,
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRCircleClip.r', 'IREllipseClip.rx', 'IREllipseClip.ry'],
} satisfies PreviewControlContract;
