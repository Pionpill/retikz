import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import {
  PolygonNodeConnectionControlId,
  PolygonNodeConnectionVisibleWhen,
} from './node-connection-playground.controls';

/** Polygon node-connection controls in English */
export const nodeConnectionPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Connection position',
  sections: [
    {
      label: 'Target node',
      controls: [
        {
          kind: 'select',
          id: PolygonNodeConnectionControlId.Shape,
          label: 'shape',
          defaultValue: 'hexagon',
          options: [
            { value: 'hexagon', label: 'Hexagon' },
            { value: 'diamond', label: 'Diamond' },
          ],
        },
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 1,
          visibleWhen: PolygonNodeConnectionVisibleWhen.CornerRadius,
        },
        {
          kind: 'select',
          id: PolygonNodeConnectionControlId.Anchor,
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
          id: PolygonNodeConnectionControlId.AnchorAngle,
          label: 'anchor angle',
          defaultValue: 45,
          min: 0,
          max: 360,
          step: 5,
          visibleWhen: PolygonNodeConnectionVisibleWhen.AnchorAngle,
        },
      ],
    },
    {
      label: 'Source node',
      controls: [
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.SourceAngle,
          label: 'Orbit angle',
          defaultValue: -35,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: PolygonNodeConnectionControlId.SourceDistance,
          label: 'Orbit distance',
          defaultValue: 108,
          min: 80,
          max: 200,
          step: 5,
        },
      ],
    },
  ],
});

/** Polygon node-connection stable state, presets, and API coverage */
export const previewControlContract = {
  controls: nodeConnectionPlaygroundControls,
  canonicalValues: {
    shape: 'hexagon',
    sourceAngle: -35,
    sourceDistance: 108,
    cornerRadius: 12,
    anchor: 'auto',
    anchorAngle: 45,
  },
  presets: [
    {
      id: 'diamond-auto',
      label: 'Diamond auto clip',
      values: { shape: 'diamond', anchor: 'auto' },
    },
    {
      id: 'rounded-angle',
      label: 'Rounded numeric anchor',
      values: { shape: 'hexagon', cornerRadius: 18, anchor: 'angle', anchorAngle: 135 },
    },
  ],
  relatedApis: ['Node.shape', 'Node.shape.params.cornerRadius', 'Node.position', 'Draw.way', 'IRNodeTarget.anchor'],
} satisfies PreviewControlContract;
