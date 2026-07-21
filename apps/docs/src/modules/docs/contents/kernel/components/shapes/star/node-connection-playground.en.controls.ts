import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { StarNodeConnectionControlId, StarNodeConnectionVisibleWhen } from './node-connection-playground.controls';

/** Star node-connection controls in English */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Connection position',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'range',
          id: StarNodeConnectionControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 12,
          min: 0,
          max: 24,
          step: 1,
        },
        {
          kind: 'select',
          id: StarNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Auto clip' },
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'tip-0', label: 'tip-0' },
            { value: 'notch-0', label: 'notch-0' },
            { value: 'angle', label: 'Numeric angle' },
          ],
        },
        {
          kind: 'range',
          id: StarNodeConnectionControlId.AnchorAngle,
          label: 'anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: StarNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: StarNodeConnectionControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: StarNodeConnectionControlId.SourceDistance,
          label: 'Orbit distance',
          defaultValue: 120,
          min: 90,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Star node-connection stable state, presets, and API coverage */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { sourceAngle: -35, sourceDistance: 120, cornerRadius: 12, anchor: 'auto', anchorAngle: 45 },
  presets: [
    { id: 'sharp-tip', label: 'Sharp tip anchor', values: { cornerRadius: 0, anchor: 'tip-0' } },
    { id: 'rounded-notch', label: 'Rounded notch anchor', values: { cornerRadius: 16, anchor: 'notch-0' } },
    { id: 'numeric-anchor', label: 'Numeric anchor', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.shape', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
