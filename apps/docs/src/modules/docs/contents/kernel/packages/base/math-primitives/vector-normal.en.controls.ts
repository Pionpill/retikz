import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { VectorNormalControlId } from './vector-normal.controls';

/** English controls for vector direction and length */
export const vectorNormalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Vector',
  sections: [
    {
      label: 'Vector v',
      controls: [
        {
          kind: 'range',
          id: VectorNormalControlId.Angle,
          label: 'Angle',
          defaultValue: -30,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: VectorNormalControlId.Length,
          label: 'Length',
          defaultValue: 120,
          min: 40,
          max: 140,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English vector playground */
export const previewControlContract = {
  controls: vectorNormalControls,
  canonicalValues: { angle: -30, length: 120 },
  presets: [
    { id: 'axis', label: 'Horizontal', values: { angle: 0, length: 120 } },
    { id: 'diagonal', label: 'Diagonal', values: { angle: -45, length: 110 } },
    { id: 'obtuse', label: 'Obtuse', values: { angle: 135, length: 90 } },
  ],
  relatedApis: ['point.add', 'point.scale', 'vector2.fromAngleDegrees', 'vector2.normal'],
} satisfies PreviewControlContract;
