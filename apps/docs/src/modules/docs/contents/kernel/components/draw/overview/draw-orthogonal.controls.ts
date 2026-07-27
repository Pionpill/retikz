import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Draw 正交连接的中文属性面板 */
export const drawOrthogonalControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw 正交连接',
  sections: [
    {
      label: '连接',
      controls: [
        {
          kind: 'select',
          id: 'connection',
          label: '连接方式',
          defaultValue: 'horizontal',
          options: [
            { value: 'horizontal', label: '水平单轴' },
            { value: 'vertical', label: '垂直单轴' },
            { value: 'fold', label: '折线连接' },
          ],
        },
      ],
    },
    {
      label: '折线',
      visibleWhen: { controlId: 'connection', oneOf: ['fold'] },
      controls: [
        {
          kind: 'select',
          id: 'via',
          label: '折线方向',
          defaultValue: '-|',
          options: [
            { value: '-|', label: '水平 → 垂直' },
            { value: '|-', label: '垂直 → 水平' },
            { value: '-|-', label: '水平 → 垂直 → 水平' },
            { value: '|-|', label: '垂直 → 水平 → 垂直' },
          ],
        },
        {
          kind: 'range',
          id: 'fraction',
          label: '中间位置',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
          visibleWhen: { controlId: 'via', oneOf: ['-|-', '|-|'] },
        },
      ],
    },
  ],
});

/** 当前 controls 面板的稳定文档契约 */
export const previewControlContract = {
  controls: drawOrthogonalControls,
  canonicalValues: { connection: 'horizontal', via: '-|', fraction: 0.5 },
  relatedApis: [
    'Draw.way',
    'WayAxisLineOp.horizontalTo',
    'WayAxisLineOp.verticalTo',
    'WayFoldOp.via',
    'WayFoldOp.fraction',
  ],
} satisfies PreviewControlContract;
