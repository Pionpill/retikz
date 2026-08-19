import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { TexPlaygroundControlId, TexPlaygroundFormula } from './tex-playground.controls';

/** English controls for TeX source and layout metrics */
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
  ],
});

/** Stable state, presets, and API coverage for the English Tex playground */
export const previewControlContract = {
  controls: texPlaygroundControls,
  canonicalValues: {
    source: TexPlaygroundFormula.DisplaySum,
    displayMode: 'display',
    fontSize: 22,
  },
  presetSelector: {
    label: 'Formula example',
    customLabel: 'Custom',
  },
  presets: [
    {
      id: 'inline-energy',
      label: 'Inline mass-energy',
      values: {
        source: TexPlaygroundFormula.InlineEnergy,
        displayMode: 'inline',
        fontSize: 24,
      },
    },
    {
      id: 'display-sum',
      label: 'Display summation',
      values: {
        source: TexPlaygroundFormula.DisplaySum,
        displayMode: 'display',
        fontSize: 22,
      },
    },
    {
      id: 'multiline-derivatives',
      label: 'Multiline derivatives',
      values: {
        source: TexPlaygroundFormula.MultilineDerivatives,
        displayMode: 'display',
        fontSize: 18,
      },
    },
  ],
  relatedApis: ['Node.text', 'IRTexContent.tex', 'IRTexContent.displayMode', 'Node.font'],
} satisfies PreviewControlContract;
