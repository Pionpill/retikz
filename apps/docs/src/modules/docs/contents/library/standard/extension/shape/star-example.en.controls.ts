import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { StarExampleControlId } from './star-example.controls';

/** Controls for the Star example */
export const starExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Star',
  sections: [
    {
      label: 'Star geometry',
      controls: [
        {
          kind: 'range',
          id: StarExampleControlId.Points,
          label: 'Point count',
          defaultValue: 5,
          min: 3,
          max: 10,
          step: 1,
        },
        {
          kind: 'range',
          id: StarExampleControlId.InnerRadius,
          label: 'Inner radius',
          defaultValue: 30,
          min: 14,
          max: 52,
          step: 2,
        },
        {
          kind: 'range',
          id: StarExampleControlId.OuterRadius,
          label: 'Outer radius',
          defaultValue: 68,
          min: 54,
          max: 82,
          step: 2,
        },
        {
          kind: 'range',
          id: StarExampleControlId.Rotate,
          label: 'Rotation',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: StarExampleControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 3,
          min: 0,
          max: 14,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Star example */
export const previewControlContract = {
  controls: starExampleControls,
  canonicalValues: { points: 5, innerRadius: 30, outerRadius: 68, rotate: 0, cornerRadius: 3 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
