import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 几何圆角 playground 的中文属性面板 */
export const pathRoundedCornersControls = definePreviewControls({
  presentation: 'panel',
  title: '折线圆角',
  sections: [
    {
      label: '几何与描边',
      controls: [
        { kind: 'range', id: 'radius', label: 'roundedCorners', defaultValue: 28, min: 0, max: 60, step: 2 },
        { kind: 'range', id: 'strokeWidth', label: '描边宽度', defaultValue: 18, min: 2, max: 28, step: 2 },
        {
          kind: 'select',
          id: 'lineJoin',
          label: 'lineJoin',
          defaultValue: 'round',
          options: [
            { value: 'miter', label: 'miter' },
            { value: 'round', label: 'round' },
            { value: 'bevel', label: 'bevel' },
          ],
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathRoundedCornersControls,
  canonicalValues: { radius: 28, strokeWidth: 18, lineJoin: 'round' },
  relatedApis: ['Path.roundedCorners', 'Path.strokeWidth', 'Path.lineJoin'],
} satisfies PreviewControlContract;
