import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { LayoutViewBoxControlId } from './layout-viewbox.controls';

/** Layout output-boundary controls in English */
export const layoutViewboxControls = definePreviewControls({
  presentation: 'panel',
  title: 'Layout Output Boundary',
  sections: [
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

/** Stable documentation contract for the Layout output-boundary controls */
export const previewControlContract = {
  controls: layoutViewboxControls,
  canonicalValues: {
    viewBoxX: -120,
    viewBoxY: -120,
    viewBoxWidth: 240,
    viewBoxHeight: 240,
  },
  relatedApis: ['Layout.viewBox'],
} satisfies PreviewControlContract;
