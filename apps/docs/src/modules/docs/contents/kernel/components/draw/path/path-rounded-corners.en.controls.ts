import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English controls for the rounded Path playground */
export const pathRoundedCornersControls = definePreviewControls({
  presentation: 'panel',
  title: 'Rounded polyline',
  sections: [
    {
      label: 'Geometry and stroke',
      controls: [
        { kind: 'range', id: 'radius', label: 'roundedCorners', defaultValue: 28, min: 0, max: 60, step: 2 },
        { kind: 'range', id: 'strokeWidth', label: 'Stroke width', defaultValue: 18, min: 2, max: 28, step: 2 },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: 'round',
          options: [
            { value: 'miter', label: 'miter' },
            { value: 'round', label: 'round' },
            { value: 'bevel', label: 'bevel' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathRoundedCornersControls,
  canonicalValues: { radius: 28, strokeWidth: 18, lineJoin: 'round' },
  relatedApis: ['Path.roundedCorners', 'Path.strokeWidth', 'Path.lineJoin'],
} satisfies PreviewControlContract;
