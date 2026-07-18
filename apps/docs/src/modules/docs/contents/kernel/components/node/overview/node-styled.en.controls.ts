import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { NodeStyledControlId } from './node-styled.controls';

/** Node styling demo controls panel in English */
export const nodeStyledControls = definePreviewControls({
  presentation: 'panel',
  title: 'Node Properties',
  sections: [
    {
      label: 'Content',
      controls: [
        {
          kind: 'text',
          id: NodeStyledControlId.Text,
          label: 'Text',
          defaultValue: 'Node',
        },
        {
          kind: 'select',
          id: NodeStyledControlId.Shape,
          label: 'Shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
            { value: 'ellipse', label: 'Ellipse' },
            { value: 'diamond', label: 'Diamond' },
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
