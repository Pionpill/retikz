import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { LayoutViewBoxControlId } from './layout-viewbox.controls';

/** Layout output-boundary controls in English */
export const layoutViewboxControls = definePreviewControls({
  presentation: 'panel',
  title: 'Layout Output Boundary',
  sections: [
    {
      label: 'Framing',
      controls: [
        {
          kind: 'switch',
          id: LayoutViewBoxControlId.ViewBoxEnabled,
          label: 'Set explicit viewBox',
          defaultValue: false,
        },
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxX,
          visibleWhen: { controlId: LayoutViewBoxControlId.ViewBoxEnabled, oneOf: [true] },
          label: 'Origin x',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxY,
          visibleWhen: { controlId: LayoutViewBoxControlId.ViewBoxEnabled, oneOf: [true] },
          label: 'Origin y',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxWidth,
          visibleWhen: { controlId: LayoutViewBoxControlId.ViewBoxEnabled, oneOf: [true] },
          label: 'ViewBox width',
          defaultValue: 240,
          min: 80,
          max: 400,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxHeight,
          visibleWhen: { controlId: LayoutViewBoxControlId.ViewBoxEnabled, oneOf: [true] },
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
    viewBoxEnabled: false,
    viewBoxX: -120,
    viewBoxY: -120,
    viewBoxWidth: 240,
    viewBoxHeight: 240,
  },
  relatedApis: ['Layout.viewBox'],
} satisfies PreviewControlContract;
