import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { TexExtensionsControlId } from './tex-extensions.controls';

/** English controls for MathJaxEngineOptions */
export const texExtensionsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Extension usage',
  sections: [
    {
      label: 'Engine options',
      controls: [
        {
          kind: 'select',
          id: TexExtensionsControlId.Example,
          label: 'Formula example',
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Base TeX' },
            { value: 'ams', label: 'AMS alignment' },
            { value: 'newcommand', label: 'Custom command' },
            { value: 'boldsymbol', label: 'Bold math symbols' },
            { value: 'braket', label: 'Bra-ket notation' },
            { value: 'cancel', label: 'Cancellation marks' },
            { value: 'cases', label: 'Cases environment' },
            { value: 'centernot', label: 'Centered negation' },
            { value: 'mathtools', label: 'Math tools' },
            { value: 'color', label: 'Color commands' },
          ],
        },
        {
          kind: 'select',
          id: TexExtensionsControlId.Profile,
          label: 'Profile',
          defaultValue: 'base',
          options: [
            { value: 'base', label: 'Base' },
            { value: 'math', label: 'Math extensions' },
          ],
        },
      ],
    },
    {
      label: 'Added extensions',
      controls: [
        {
          kind: 'switch',
          id: TexExtensionsControlId.Ams,
          label: 'Enable ams',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Newcommand,
          label: 'Enable newcommand',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Boldsymbol,
          label: 'Enable boldsymbol',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Braket,
          label: 'Enable braket',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Cancel,
          label: 'Enable cancel',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Cases,
          label: 'Enable cases',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Centernot,
          label: 'Enable centernot',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Mathtools,
          label: 'Enable mathtools',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: TexExtensionsControlId.Color,
          label: 'Enable color',
          defaultValue: false,
        },
      ],
    },
  ],
});

/** Stable state and API coverage for the English extension demo */
export const previewControlContract = {
  controls: texExtensionsControls,
  canonicalValues: {
    example: 'none',
    profile: 'base',
    ams: false,
    newcommand: false,
    boldsymbol: false,
    braket: false,
    cancel: false,
    cases: false,
    centernot: false,
    mathtools: false,
    color: false,
  },
  relatedApis: [
    'MathJaxEngineOptions.profile',
    'MathJaxEngineOptions.extensions',
    'MathJaxProfile',
    'MathJaxExtension',
  ],
} satisfies PreviewControlContract;
