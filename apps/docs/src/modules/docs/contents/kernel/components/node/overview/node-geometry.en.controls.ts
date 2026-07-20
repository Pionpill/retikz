import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { NodeGeometryControlId } from './node-geometry.controls';

/** Node geometry controls panel in English */
export const nodeGeometryControls = definePreviewControls({
  presentation: 'panel',
  title: 'Geometry',
  sections: [
    {
      label: 'Spacing and size',
      controls: [
        {
          kind: 'range',
          id: NodeGeometryControlId.PaddingX,
          label: 'Horizontal padding',
          defaultValue: 18,
          min: 0,
          max: 36,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.PaddingY,
          label: 'Vertical padding',
          defaultValue: 10,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Margin,
          label: 'Margin',
          defaultValue: 8,
          min: 0,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.MinimumWidth,
          label: 'Minimum width',
          defaultValue: 40,
          min: 40,
          max: 140,
          step: 10,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.MinimumHeight,
          label: 'Minimum height',
          defaultValue: 24,
          min: 24,
          max: 72,
          step: 4,
        },
      ],
    },
    {
      label: 'Shape and transform',
      controls: [
        {
          kind: 'range',
          id: NodeGeometryControlId.CornerRadius,
          label: 'Corner radius',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Scale,
          label: 'Scale',
          defaultValue: 1,
          min: 0.5,
          max: 1.4,
          step: 0.1,
        },
        {
          kind: 'range',
          id: NodeGeometryControlId.Rotate,
          label: 'Rotate',
          defaultValue: 0,
          min: -90,
          max: 90,
          step: 5,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node geometry controls */
export const previewControlContract = {
  controls: nodeGeometryControls,
  canonicalValues: {
    paddingX: 18,
    paddingY: 10,
    margin: 8,
    minimumWidth: 40,
    minimumHeight: 24,
    cornerRadius: 8,
    scale: 1,
    rotate: 0,
  },
  relatedApis: ['Node.padding', 'Node.margin', 'Node.minimumSize', 'Node.cornerRadius', 'Node.scale', 'Node.rotate'],
} satisfies PreviewControlContract;
