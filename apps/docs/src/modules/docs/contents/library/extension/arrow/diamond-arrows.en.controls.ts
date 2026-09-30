import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { DiamondArrowsControlId } from './diamond-arrows.controls';

/** 菱形箭头的英文属性面板 */
export const diamondArrowsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Diamond arrows',
  sections: [
    {
      controls: [
        { kind: 'color', id: DiamondArrowsControlId.Color, label: 'Color', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: DiamondArrowsControlId.Scale,
          label: 'Scale',
          defaultValue: 1,
          min: 0.5,
          max: 2,
          step: 0.1,
        },
        {
          kind: 'range',
          id: DiamondArrowsControlId.LineWidth,
          label: 'Hollow stroke',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
      ],
    },
  ],
});

/** 菱形箭头的稳定文档契约 */
export const previewControlContract = {
  controls: diamondArrowsControls,
  canonicalValues: { color: '#2563eb', scale: 1, lineWidth: 1.5 },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
