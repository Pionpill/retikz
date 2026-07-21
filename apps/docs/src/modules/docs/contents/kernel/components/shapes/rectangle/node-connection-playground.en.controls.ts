import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import {
  RectangleNodeConnectionControlId,
  RectangleNodeConnectionVisibleWhen,
} from './node-connection-playground.controls';

/** Rectangle node-connection controls in English */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Connection position',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 14,
          min: 0,
          max: 32,
          step: 1,
        },
        {
          kind: 'select',
          id: RectangleNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Auto clip' },
            { value: 'center', label: 'center' },
            { value: 'top', label: 'top' },
            { value: 'right', label: 'right' },
            { value: 'bottom', label: 'bottom' },
            { value: 'left', label: 'left' },
            { value: 'angle', label: 'Numeric angle' },
          ],
        },
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.AnchorAngle,
          label: 'anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: RectangleNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: RectangleNodeConnectionControlId.SourceDistance,
          label: 'Orbit distance',
          defaultValue: 105,
          min: 80,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Rectangle node-connection stable state, presets, and API coverage */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { sourceAngle: -35, sourceDistance: 105, cornerRadius: 14, anchor: 'auto', anchorAngle: 45 },
  presets: [
    {
      id: 'square-auto',
      label: 'Square-corner auto clip',
      values: { cornerRadius: 0, sourceAngle: 45, anchor: 'auto' },
    },
    { id: 'numeric-anchor', label: 'Numeric anchor', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
