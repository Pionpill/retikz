import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { LayoutViewBoxControlId } from './layout-viewbox.controls';

/** Layout output-boundary controls in English */
export const layoutViewboxControls = definePreviewControls({
  presentation: 'panel',
  title: 'Layout Output Boundary',
  sections: [
    {
      label: 'Display size',
      controls: [
        {
          kind: 'range',
          id: LayoutViewBoxControlId.Width,
          label: 'Display width',
          defaultValue: 300,
          min: 180,
          max: 420,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.Height,
          label: 'Display height',
          defaultValue: 200,
          min: 160,
          max: 320,
          step: 10,
        },
      ],
    },
    {
      label: 'Internal viewBox',
      controls: [
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxX,
          label: 'Origin x',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxY,
          label: 'Origin y',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxWidth,
          label: 'ViewBox width',
          defaultValue: 240,
          min: 80,
          max: 400,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxHeight,
          label: 'ViewBox height',
          defaultValue: 240,
          min: 80,
          max: 400,
          step: 10,
        },
      ],
    },
  ],
});
