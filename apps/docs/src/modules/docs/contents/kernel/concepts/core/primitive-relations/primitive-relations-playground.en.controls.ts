import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import {
  PrimitiveRelationsPlaygroundControlId,
  PrimitiveRelationsPlaygroundVisibleWhen,
} from './primitive-relations-playground.controls';

/** Primitive Relations endpoint controls in English */
export const primitiveRelationsPlaygroundEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Endpoint relation',
  sections: [
    {
      label: 'Target endpoint',
      controls: [
        {
          kind: 'select',
          id: PrimitiveRelationsPlaygroundControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Auto boundary' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'angle', label: 'Numeric angle' },
          ],
        },
        {
          kind: 'range',
          id: PrimitiveRelationsPlaygroundControlId.AnchorAngle,
          label: 'Anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: PrimitiveRelationsPlaygroundVisibleWhen.AnchorAngle,
        },
        {
          kind: 'select',
          id: PrimitiveRelationsPlaygroundControlId.BoundaryOverride,
          label: 'boundary',
          defaultValue: 'inherit',
          options: [
            { value: 'inherit', label: 'Inherit rectangle' },
            { value: 'shape', label: 'Visual shape' },
            { value: 'circle', label: 'Circle for this endpoint' },
          ],
        },
      ],
    },
    {
      label: 'Source primitive',
      controls: [
        {
          kind: 'range',
          id: PrimitiveRelationsPlaygroundControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Primitive Relations playground */
export const previewControlContract = {
  controls: primitiveRelationsPlaygroundEnControls,
  canonicalValues: { anchor: 'auto', anchorAngle: 45, boundaryOverride: 'inherit', sourceAngle: -35 },
  presets: [
    { id: 'auto-follow', label: 'Auto follow', values: { anchor: 'auto', boundaryOverride: 'inherit' } },
    { id: 'locked-right', label: 'Lock right', values: { anchor: 'right', boundaryOverride: 'inherit' } },
    {
      id: 'circle-override',
      label: 'Circle endpoint override',
      values: { anchor: 'auto', boundaryOverride: 'circle' },
    },
  ],
  relatedApis: ['Draw.way', 'IRNodeTarget.anchor', 'IRNodeTarget.boundary'],
} satisfies PreviewControlContract;
