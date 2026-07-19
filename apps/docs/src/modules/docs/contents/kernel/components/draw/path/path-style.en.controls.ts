import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** English controls for the Path appearance playground */
export const pathStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path appearance',
  sections: [
    {
      label: 'Stroke',
      controls: [
        { kind: 'color', id: 'stroke', label: 'Color', defaultValue: '#172033' },
        {
          kind: 'select',
          id: 'thickness',
          label: 'Thickness',
          defaultValue: 'custom',
          options: [
            { value: 'custom', label: 'Custom' },
            { value: 'thin', label: 'thin' },
            { value: 'semithick', label: 'semithick' },
            { value: 'thick', label: 'thick' },
            { value: 'veryThick', label: 'veryThick' },
          ],
        },
        {
          kind: 'range',
          id: 'strokeWidth',
          label: 'strokeWidth',
          defaultValue: 5,
          min: 1,
          max: 14,
          step: 1,
          visibleWhen: { controlId: 'thickness', oneOf: ['custom'] },
        },
        { kind: 'switch', id: 'dashed', label: 'Dashed', defaultValue: true },
        {
          kind: 'range',
          id: 'dashOffset',
          label: 'dashOffset',
          defaultValue: 0,
          min: -16,
          max: 16,
          step: 1,
          visibleWhen: { controlId: 'dashed', oneOf: [true] },
        },
      ],
    },
    {
      label: 'Caps, joins, and opacity',
      controls: [
        {
          kind: 'select',
          id: 'lineCap',
          label: 'lineCap',
          defaultValue: 'round',
          options: [
            { value: 'butt', label: 'butt' },
            { value: 'round', label: 'round' },
            { value: 'square', label: 'square' },
          ],
        },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: 'round',
          options: [
            { value: 'miter', label: 'miter' },
            { value: 'round', label: 'round' },
            { value: 'bevel', label: 'bevel' },
          ],
        },
        { kind: 'range', id: 'opacity', label: 'Overall opacity', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'strokeOpacity', label: 'Stroke opacity', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
        { kind: 'range', id: 'fillOpacity', label: 'Fill opacity', defaultValue: 0.35, min: 0, max: 1, step: 0.05 },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathStyleControls,
  canonicalValues: {
    stroke: '#172033',
    thickness: 'custom',
    strokeWidth: 5,
    dashed: true,
    dashOffset: 0,
    lineCap: 'round',
    lineJoin: 'round',
    opacity: 1,
    strokeOpacity: 1,
    fillOpacity: 0.35,
  },
  relatedApis: [
    'Path.stroke',
    'Path.thickness',
    'Path.strokeWidth',
    'Path.opacity',
    'Path.dashPattern',
    'Path.dashOffset',
    'Path.lineCap',
    'Path.lineJoin',
    'Path.strokeOpacity',
    'Path.fillOpacity',
  ],
} satisfies PreviewControlContract;
