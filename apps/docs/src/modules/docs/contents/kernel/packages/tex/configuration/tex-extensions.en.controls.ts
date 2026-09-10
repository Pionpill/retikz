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
      ],
    },
  ],
});

/** Stable state and API coverage for the English extension demo */
export const previewControlContract = {
  controls: texExtensionsControls,
  canonicalValues: {
    example: 'none',
  },
  relatedApis: ['MathJaxEngineOptions.extensions', 'MathJaxExtension'],
} satisfies PreviewControlContract;
