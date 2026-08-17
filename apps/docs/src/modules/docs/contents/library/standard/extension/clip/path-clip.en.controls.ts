import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PathClipControlId } from './path-clip.controls';

/** English controls for the path clip example */
export const pathClipControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path clip',
  sections: [
    {
      label: 'Command coordinates',
      controls: [
        {
          kind: 'range',
          id: PathClipControlId.TipX,
          label: 'Arrow tip',
          defaultValue: 78,
          min: 48,
          max: 92,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.NotchX,
          label: 'Tail notch',
          defaultValue: -38,
          min: -58,
          max: -18,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.HalfHeight,
          label: 'Outline half-height',
          defaultValue: 50,
          min: 32,
          max: 66,
          step: 2,
        },
        {
          kind: 'range',
          id: PathClipControlId.HoleSize,
          label: 'Center hole size',
          defaultValue: 14,
          min: 6,
          max: 24,
          step: 2,
        },
      ],
    },
    {
      label: 'Fill rule',
      controls: [
        {
          kind: 'select',
          id: PathClipControlId.FillRule,
          label: 'Rule',
          defaultValue: 'evenodd',
          options: [
            { value: 'nonzero', label: 'Nonzero' },
            { value: 'evenodd', label: 'Even-odd' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the path clip example */
export const previewControlContract = {
  controls: pathClipControls,
  canonicalValues: {
    tipX: 78,
    notchX: -38,
    halfHeight: 50,
    holeSize: 14,
    fillRule: 'evenodd',
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRPathClip.commands', 'IRPathClip.fillRule'],
} satisfies PreviewControlContract;
