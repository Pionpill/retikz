import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { ScopeIdReferenceControlId, ScopeIdReferenceVisibleWhen } from './scope-id-reference.controls';

/** Scope group-reference and output-boundary controls in English */
export const scopeIdReferenceEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope target',
  sections: [
    {
      label: 'Target boundary',
      controls: [
        {
          kind: 'select',
          id: ScopeIdReferenceControlId.BoundingShape,
          label: 'shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
          ],
        },
      ],
    },
    {
      label: 'Connection point',
      controls: [
        {
          kind: 'select',
          id: ScopeIdReferenceControlId.Anchor,
          label: 'anchor',
          defaultValue: 'left',
          options: [
            { value: 'center', label: 'Center' },
            { value: 'top', label: 'Top' },
            { value: 'top-right', label: 'Top right' },
            { value: 'right', label: 'Right' },
            { value: 'bottom-right', label: 'Bottom right' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'bottom-left', label: 'Bottom left' },
            { value: 'left', label: 'Left' },
            { value: 'top-left', label: 'Top left' },
            { value: 'angle', label: 'Custom angle' },
          ],
        },
        {
          kind: 'range',
          id: ScopeIdReferenceControlId.AngleDegrees,
          label: 'Angle',
          defaultValue: 180,
          min: 0,
          max: 360,
          step: 1,
          visibleWhen: ScopeIdReferenceVisibleWhen.Angle,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Scope identifier-reference controls */
export const previewControlContract = {
  controls: scopeIdReferenceEnControls,
  canonicalValues: { boundingShape: 'rectangle', anchor: 'left', angleDegrees: 180 },
  relatedApis: ['Scope.boundingShape', 'Draw.way'],
} satisfies PreviewControlContract;
