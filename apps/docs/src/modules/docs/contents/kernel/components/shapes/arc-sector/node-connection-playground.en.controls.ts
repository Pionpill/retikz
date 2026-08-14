import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import {
  ArcSectorNodeConnectionControlId,
  ArcSectorNodeConnectionVisibleWhen,
} from './node-connection-playground.controls';

/** Open-arc and Sector node-connection controls in English */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Connection position',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'select',
          id: ArcSectorNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'sector',
          options: [
            { value: 'sector', label: 'Sector / ring wedge' },
            { value: 'open-arc', label: 'Open arc' },
          ],
        },
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.CornerRadius,
          label: 'Sector rounding',
          defaultValue: 12,
          min: 0,
          max: 18,
          step: 1,
          visibleWhen: ArcSectorNodeConnectionVisibleWhen.CornerRadius,
        },
        {
          kind: 'select',
          id: ArcSectorNodeConnectionControlId.Anchor,
          label: 'anchor',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Auto clip' },
            { value: 'center', label: 'center' },
            { value: 'start', label: 'Start side' },
            { value: 'midpoint', label: 'Outer arc midpoint' },
            { value: 'inner-midpoint', label: 'Inner arc midpoint' },
            { value: 'end', label: 'End side' },
          ],
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: 155,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: ArcSectorNodeConnectionControlId.SourceDistance,
          label: 'Orbit distance',
          defaultValue: 125,
          min: 90,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Open-arc and Sector node-connection stable state, presets, and API coverage */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: { shape: 'sector', cornerRadius: 12, sourceAngle: 155, sourceDistance: 125, anchor: 'auto' },
  presets: [
    {
      id: 'open-arc-auto',
      label: 'Open arc with auto clip',
      values: { shape: 'open-arc', sourceAngle: 145, anchor: 'auto' },
    },
    { id: 'sector-sharp', label: 'Sharp sector', values: { shape: 'sector', cornerRadius: 0, anchor: 'auto' } },
    { id: 'sector-midpoint', label: 'Sector arc midpoint', values: { shape: 'sector', anchor: 'midpoint' } },
    {
      id: 'sector-inner-midpoint',
      label: 'Sector inner arc midpoint',
      values: { shape: 'sector', anchor: 'inner-midpoint' },
    },
    { id: 'open-arc-end', label: 'Open arc end', values: { shape: 'open-arc', anchor: 'end' } },
  ],
  relatedApis: ['Node.shape', 'Node.shape.params.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
