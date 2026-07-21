import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Path 整体变换的中文属性面板 */
export const pathTransformControls = definePreviewControls({
  presentation: 'panel',
  title: '路径变换',
  sections: [
    {
      label: '变换',
      controls: [
        { kind: 'range', id: 'rotate', label: '旋转', defaultValue: 40, min: -180, max: 180, step: 5 },
        {
          kind: 'point',
          id: 'scale',
          label: '缩放',
          defaultValue: [1, 1],
          min: [0.5, 0.5],
          max: [1.5, 1.5],
          step: 0.1,
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: pathTransformControls,
  canonicalValues: { rotate: 40, scale: [1, 1] },
  relatedApis: ['Path.rotate', 'Path.scale'],
} satisfies PreviewControlContract;
