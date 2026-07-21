import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** English controls for the Ribbon endpoints playground */
export const ribbonEndpointsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Ribbon endpoints',
  sections: [
    {
      label: 'Direction and alignment',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: 'Endpoint direction',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: 'Automatic tangent' },
            { value: 'angle', label: 'Angle' },
            { value: 'vector', label: 'Vector' },
            { value: 'polar', label: 'Polar vector' },
          ],
        },
        {
          kind: 'range',
          id: 'angle',
          label: 'Angle',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 5,
          visibleWhen: { controlId: 'direction', oneOf: ['angle', 'vector', 'polar'] },
        },
        {
          kind: 'select',
          id: 'align',
          label: 'align',
          defaultValue: 'center',
          options: [
            { value: 'left', label: 'left' },
            { value: 'center', label: 'center' },
            { value: 'right', label: 'right' },
          ],
        },
      ],
    },
    {
      label: 'Caps',
      controls: [
        {
          kind: 'select',
          id: 'cap',
          label: 'cap',
          defaultValue: 'round',
          options: [
            { value: 'butt', label: 'butt' },
            { value: 'square', label: 'square' },
            { value: 'round', label: 'round' },
            { value: 'arc', label: 'arc' },
          ],
        },
        { kind: 'range', id: 'width', label: 'Width', defaultValue: 30, min: 8, max: 60, step: 2 },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: ribbonEndpointsControls,
  canonicalValues: { direction: 'auto', angle: 0, align: 'center', cap: 'round', width: 30 },
  relatedApis: ['Path.kind', 'Path.ribbon'],
} satisfies PreviewControlContract;
