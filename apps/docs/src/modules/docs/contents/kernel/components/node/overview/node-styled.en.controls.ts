import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { NodeStyledControlId } from './node-styled.controls';

/** Node styling demo controls panel in English */
export const nodeStyledControls = definePreviewControls({
  presentation: 'panel',
  title: 'Properties',
  sections: [
    {
      label: 'Font',
      controls: [
        {
          kind: 'select',
          id: NodeStyledControlId.FontFamily,
          label: 'Family',
          defaultValue: 'sans-serif',
          options: [
            { value: 'sans-serif', label: 'Sans serif' },
            { value: 'serif', label: 'Serif' },
            { value: 'monospace', label: 'Monospace' },
          ],
        },
        {
          kind: 'range',
          id: NodeStyledControlId.FontSize,
          label: 'Size',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: NodeStyledControlId.FontWeight,
          label: 'Weight',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: NodeStyledControlId.FontStyle,
          label: 'Style',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
      ],
    },
    {
      label: 'Appearance',
      controls: [
        {
          kind: 'color',
          id: NodeStyledControlId.Fill,
          label: 'Fill',
          defaultValue: '#e2e8f0',
        },
        {
          kind: 'color',
          id: NodeStyledControlId.Stroke,
          label: 'Stroke',
          defaultValue: '#f97316',
        },
        {
          kind: 'number',
          id: NodeStyledControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 0,
          max: 12,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: NodeStyledControlId.Dashed,
          label: 'Dashed',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: NodeStyledControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Node style controls */
export const previewControlContract = {
  controls: nodeStyledControls,
  canonicalValues: {
    fontFamily: 'sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#e2e8f0',
    stroke: '#f97316',
    strokeWidth: 2,
    dashed: false,
    opacity: 1,
  },
  relatedApis: ['Node.font', 'Node.fill', 'Node.stroke', 'Node.strokeWidth', 'Node.dashed', 'Node.opacity'],
} satisfies PreviewControlContract;
