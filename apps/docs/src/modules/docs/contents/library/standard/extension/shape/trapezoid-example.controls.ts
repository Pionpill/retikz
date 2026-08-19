import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Trapezoid 示例使用的稳定字段 id */
export const TrapezoidExampleControlId = {
  ShortSide: 'shortSide',
  ShortSideRatio: 'shortSideRatio',
  CornerRadius: 'cornerRadius',
} as const;

/** Trapezoid 示例的中文属性面板 */
export const trapezoidExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '梯形',
  sections: [
    {
      label: '轮廓参数',
      controls: [
        {
          kind: 'select',
          id: TrapezoidExampleControlId.ShortSide,
          label: '短边方向',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '上' },
            { value: 'right', label: '右' },
            { value: 'bottom', label: '下' },
            { value: 'left', label: '左' },
          ],
        },
        {
          kind: 'range',
          id: TrapezoidExampleControlId.ShortSideRatio,
          label: '短边比例',
          defaultValue: 0.72,
          min: 0.3,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'range',
          id: TrapezoidExampleControlId.CornerRadius,
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

/** Trapezoid 示例的稳定文档契约 */
export const previewControlContract = {
  controls: trapezoidExampleControls,
  canonicalValues: { shortSide: 'top', shortSideRatio: 0.72, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
