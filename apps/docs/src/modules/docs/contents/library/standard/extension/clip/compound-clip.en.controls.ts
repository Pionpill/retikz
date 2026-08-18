import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CompoundClipControlId } from './compound-clip.controls';

/** English controls for the compound clip example */
export const compoundClipControls = definePreviewControls({
  presentation: 'panel',
  title: 'Compound clip',
  sections: [
    {
      label: 'Child-region parameters',
      controls: [
        {
          kind: 'range',
          id: CompoundClipControlId.Radius,
          label: 'Circle radius',
          defaultValue: 58,
          min: 34,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CompoundClipControlId.Offset,
          label: 'Center distance',
          defaultValue: 38,
          min: 16,
          max: 72,
          step: 2,
        },
      ],
    },
    {
      label: 'Compound parameters',
      controls: [
        {
          kind: 'select',
          id: CompoundClipControlId.FillRule,
          label: 'Fill rule',
          defaultValue: 'evenodd',
          options: [
            { value: 'nonzero', label: 'Union-like region' },
            { value: 'evenodd', label: 'Exclude overlap' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the compound clip example */
export const previewControlContract = {
  controls: compoundClipControls,
  canonicalValues: {
    radius: 58,
    offset: 38,
    fillRule: 'evenodd',
  },
  relatedApis: ['Layout.clips', 'Scope.clip', 'IRCompoundClip.children', 'IRCompoundClip.fillRule'],
} satisfies PreviewControlContract;
