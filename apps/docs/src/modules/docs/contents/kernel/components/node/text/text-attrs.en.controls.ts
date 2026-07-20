import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { TextAttrsControlId } from './text-attrs.controls';

/** Text line-level overrides controls panel in English */
export const textAttrsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Line Properties',
  sections: [
    {
      label: 'Color and opacity',
      controls: [
        {
          kind: 'color',
          id: TextAttrsControlId.Fill,
          label: 'Text color',
          defaultValue: '#f97316',
        },
        {
          kind: 'range',
          id: TextAttrsControlId.Opacity,
          label: 'Opacity',
          defaultValue: 1,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: 'Font',
      controls: [
        {
          kind: 'select',
          id: TextAttrsControlId.FontFamily,
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
          id: TextAttrsControlId.FontSize,
          label: 'Size',
          defaultValue: 18,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'select',
          id: TextAttrsControlId.FontWeight,
          label: 'Weight',
          defaultValue: 'bold',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ],
        },
        {
          kind: 'select',
          id: TextAttrsControlId.FontStyle,
          label: 'Style',
          defaultValue: 'normal',
          options: [
            { value: 'normal', label: 'Normal' },
            { value: 'italic', label: 'Italic' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Text attribute controls */
export const previewControlContract = {
  controls: textAttrsControls,
  canonicalValues: {
    fill: '#f97316',
    opacity: 1,
    fontFamily: 'sans-serif',
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'normal',
  },
  relatedApis: ['Text.fill', 'Text.opacity', 'Text.font'],
} satisfies PreviewControlContract;
