import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English controls for the Path structure playground */
export const pathStructureControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path structure',
  sections: [
    {
      label: 'Structure',
      controls: [
        {
          kind: 'select',
          id: 'structure',
          label: 'Structure',
          defaultValue: 'polyline',
          options: [
            { value: 'polyline', label: 'Polyline' },
            { value: 'subpaths', label: 'Multiple subpaths' },
            { value: 'fill', label: 'Filled path' },
          ],
        },
        {
          kind: 'color',
          id: 'fill',
          label: 'Fill',
          defaultValue: '#1e90ff',
          visibleWhen: { controlId: 'structure', oneOf: ['fill'] },
        },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: pathStructureControls,
  canonicalValues: { structure: 'polyline', fill: '#1e90ff' },
  relatedApis: ['Path.children', 'Path.fill'],
} satisfies PreviewControlContract;
