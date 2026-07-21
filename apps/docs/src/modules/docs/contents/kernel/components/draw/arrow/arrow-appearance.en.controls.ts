import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

const shapeOptions = [
  { label: 'Solid triangle', value: 'normal' },
  { label: 'Hollow triangle', value: 'open' },
  { label: 'Solid stealth', value: 'stealth' },
  { label: 'Hollow stealth', value: 'openStealth' },
  { label: 'Solid diamond', value: 'diamond' },
  { label: 'Hollow diamond', value: 'openDiamond' },
  { label: 'Solid circle', value: 'circle' },
  { label: 'Hollow circle', value: 'openCircle' },
] as const;

/** English controls for Arrow direction, shape, per-end overrides, and appearance */
export const arrowAppearanceControls = definePreviewControls({
  presentation: 'panel',
  title: 'Arrow',
  sections: [
    {
      label: 'Endpoints',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Direction',
          defaultValue: '<->',
          options: [
            { label: 'None', value: 'none' },
            { label: 'End', value: '->' },
            { label: 'Start', value: '<-' },
            { label: 'Both', value: '<->' },
          ],
        },
        { kind: 'select', id: 'shape', label: 'Shared shape', defaultValue: 'stealth', options: shapeOptions },
        { kind: 'switch', id: 'separateEnds', label: 'Configure ends separately', defaultValue: false },
        {
          kind: 'select',
          id: 'startShape',
          label: 'Start shape',
          defaultValue: 'diamond',
          options: shapeOptions,
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        {
          kind: 'select',
          id: 'endShape',
          label: 'End shape',
          defaultValue: 'open',
          options: shapeOptions,
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
      ],
    },
    {
      label: 'Color and opacity',
      controls: [
        { kind: 'color', id: 'color', label: 'Shared color', defaultValue: '#1e90ff' },
        {
          kind: 'color',
          id: 'startColor',
          label: 'Start color',
          defaultValue: '#e63946',
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        {
          kind: 'color',
          id: 'endColor',
          label: 'End color',
          defaultValue: '#1e90ff',
          visibleWhen: { controlId: 'separateEnds', oneOf: [true] },
        },
        { kind: 'range', id: 'opacity', label: 'Arrow opacity', defaultValue: 1, min: 0.1, max: 1, step: 0.1 },
      ],
    },
    {
      label: 'Size',
      controls: [
        { kind: 'range', id: 'scale', label: 'scale', defaultValue: 1, min: 0.5, max: 2.5, step: 0.1 },
        { kind: 'range', id: 'length', label: 'length', defaultValue: 10, min: 2, max: 24, step: 1 },
        { kind: 'range', id: 'width', label: 'width', defaultValue: 8, min: 2, max: 20, step: 1 },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: arrowAppearanceControls,
  canonicalValues: {
    direction: '<->',
    shape: 'stealth',
    separateEnds: false,
    startShape: 'diamond',
    endShape: 'open',
    color: '#1e90ff',
    startColor: '#e63946',
    endColor: '#1e90ff',
    opacity: 1,
    scale: 1,
    length: 10,
    width: 8,
  },
  relatedApis: ['Draw.arrow', 'Draw.arrowDetail', 'Path.arrow', 'Path.arrowDetail'],
} satisfies PreviewControlContract;
