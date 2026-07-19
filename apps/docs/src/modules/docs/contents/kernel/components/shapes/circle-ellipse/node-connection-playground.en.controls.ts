import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import {
  CircleEllipseNodeConnectionControlId,
  CircleEllipseNodeConnectionVisibleWhen,
} from './node-connection-playground.controls';

/** Circle and ellipse node-connection controls in English */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Connection position',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'select',
          id: CircleEllipseNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'ellipse',
          options: [
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'circle', label: 'Circle' },
          ],
        },
        {
          kind: 'select',
          id: CircleEllipseNodeConnectionControlId.Anchor,
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
          id: CircleEllipseNodeConnectionControlId.AnchorAngle,
          label: 'anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: CircleEllipseNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: CircleEllipseNodeConnectionControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: CircleEllipseNodeConnectionControlId.SourceDistance,
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

/** Circle and ellipse node-connection stable state, presets, and API coverage */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { shape: 'ellipse', sourceAngle: -35, sourceDistance: 105, anchor: 'auto', anchorAngle: 45 },
  presets: [
    { id: 'circle-auto', label: 'Circle with auto clip', values: { shape: 'circle', sourceAngle: 45, anchor: 'auto' } },
    { id: 'numeric-anchor', label: 'Numeric anchor', values: { anchor: 'angle', anchorAngle: 135 } },
  ],
  relatedApis: ['Node.shape', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
