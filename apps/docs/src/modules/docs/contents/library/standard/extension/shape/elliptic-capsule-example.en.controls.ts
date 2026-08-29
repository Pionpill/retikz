import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { EllipticCapsuleExampleControlId } from './elliptic-capsule-example.controls';

/** Controls for the Elliptic Capsule example */
export const ellipticCapsuleExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Elliptic Capsule',
  sections: [
    {
      label: 'Cap parameters',
      controls: [
        {
          kind: 'select',
          id: EllipticCapsuleExampleControlId.Axis,
          label: 'Main axis',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
        {
          kind: 'range',
          id: EllipticCapsuleExampleControlId.CapDepth,
          label: 'Cap depth',
          defaultValue: 8,
          min: 0,
          max: 28,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Elliptic Capsule example */
export const previewControlContract = {
  controls: ellipticCapsuleExampleControls,
  canonicalValues: { axis: 'vertical', capDepth: 8 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
