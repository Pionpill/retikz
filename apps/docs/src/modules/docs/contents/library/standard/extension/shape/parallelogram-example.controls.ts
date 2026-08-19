import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Parallelogram 示例使用的稳定字段 id */
export const ParallelogramExampleControlId = {
  Direction: 'slantDirection',
  Angle: 'slantAngle',
  CornerRadius: 'cornerRadius',
} as const;

/** Parallelogram 示例的中文属性面板 */
export const parallelogramExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '平行四边形',
  sections: [
    {
      label: '倾斜参数',
      controls: [
        {
          kind: 'select',
          id: ParallelogramExampleControlId.Direction,
          label: '倾斜方向',
          defaultValue: 'right',
          options: [
            { value: 'left', label: '向左' },
            { value: 'right', label: '向右' },
          ],
        },
        {
          kind: 'range',
          id: ParallelogramExampleControlId.Angle,
          label: '斜边角度',
          defaultValue: 70,
          min: 45,
          max: 90,
          step: 1,
        },
        {
          kind: 'range',
          id: ParallelogramExampleControlId.CornerRadius,
          label: '圆角',
          defaultValue: 4,
          min: 0,
          max: 20,
          step: 1,
        },
      ],
    },
  ],
});

/** Parallelogram 示例的稳定文档契约 */
export const previewControlContract = {
  controls: parallelogramExampleControls,
  canonicalValues: { slantDirection: 'right', slantAngle: 70, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
