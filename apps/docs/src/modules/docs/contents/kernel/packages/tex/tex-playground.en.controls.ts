import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { TexPlaygroundControlId, TexPlaygroundFormula, TexPlaygroundVisibleWhen } from './tex-playground.controls';

/** English controls for TeX source, metrics, and framing */
export const texPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Formula',
  sections: [
    {
      label: 'Formula',
      controls: [
        {
          kind: 'text',
          id: TexPlaygroundControlId.Source,
          label: 'TeX source',
          defaultValue: TexPlaygroundFormula.DisplaySum,
          placeholder: String.raw`\frac{a}{b} = c`,
          multiline: true,
        },
        {
          kind: 'select',
          id: TexPlaygroundControlId.DisplayMode,
          label: 'Metrics',
          defaultValue: 'display',
          options: [
            { value: 'inline', label: 'inline' },
            { value: 'display', label: 'display' },
          ],
        },
        {
          kind: 'range',
          id: TexPlaygroundControlId.FontSize,
          label: 'Font size',
          defaultValue: 22,
          min: 14,
          max: 32,
          step: 1,
        },
      ],
    },
    {
      label: 'Container',
      controls: [
        {
          kind: 'select',
          id: TexPlaygroundControlId.Shape,
          label: 'shape',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'No frame' },
            { value: 'rectangle', label: 'Rectangle' },
            { value: 'circle', label: 'Circle' },
          ],
        },
        {
          kind: 'range',
          id: TexPlaygroundControlId.Padding,
          label: 'padding',
          defaultValue: 14,
          min: 4,
          max: 28,
          step: 1,
          visibleWhen: TexPlaygroundVisibleWhen.Padding,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English Tex playground */
export const previewControlContract = {
  controls: texPlaygroundControls,
  canonicalValues: {
    source: TexPlaygroundFormula.DisplaySum,
    displayMode: 'display',
    fontSize: 22,
    shape: 'none',
    padding: 14,
  },
  presets: [
    {
      id: 'inline-energy',
      label: 'Inline mass-energy',
      values: {
        source: TexPlaygroundFormula.InlineEnergy,
        displayMode: 'inline',
        fontSize: 24,
        shape: 'none',
        padding: 14,
      },
    },
    {
      id: 'display-sum',
      label: 'Display summation',
      values: {
        source: TexPlaygroundFormula.DisplaySum,
        displayMode: 'display',
        fontSize: 22,
        shape: 'none',
        padding: 14,
      },
    },
    {
      id: 'multiline-derivatives',
      label: 'Multiline derivatives',
      values: {
        source: TexPlaygroundFormula.MultilineDerivatives,
        displayMode: 'display',
        fontSize: 18,
        shape: 'rectangle',
        padding: 14,
      },
    },
    {
      id: 'framed-contour',
      label: 'Framed contour integral',
      values: {
        source: TexPlaygroundFormula.FramedContour,
        displayMode: 'display',
        fontSize: 22,
        shape: 'circle',
        padding: 18,
      },
    },
  ],
  relatedApis: ['Node.text', 'IRTexContent.tex', 'IRTexContent.displayMode', 'Node.font', 'Node.shape', 'Node.padding'],
} satisfies PreviewControlContract;
