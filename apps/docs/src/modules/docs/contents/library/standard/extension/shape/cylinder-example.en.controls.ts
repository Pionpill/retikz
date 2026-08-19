import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { CylinderExampleControlId } from './cylinder-example.controls';

/** Controls for the Cylinder example */
export const cylinderExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cylinder',
  sections: [
    {
      label: 'Cap parameters',
      controls: [
        {
          kind: 'select',
          id: CylinderExampleControlId.Axis,
          label: 'Main axis',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: 'Vertical' },
            { value: 'horizontal', label: 'Horizontal' },
          ],
        },
        {
          kind: 'range',
          id: CylinderExampleControlId.CapDepth,
          label: 'Cap depth',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 1,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Cylinder example */
export const previewControlContract = {
  controls: cylinderExampleControls,
  canonicalValues: { axis: 'vertical', capDepth: 12 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
