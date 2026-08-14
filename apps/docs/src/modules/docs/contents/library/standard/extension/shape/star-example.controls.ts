import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Star 示例使用的稳定字段 id */
export const StarExampleControlId = {
  Points: 'points',
  InnerRadius: 'innerRadius',
  OuterRadius: 'outerRadius',
  Rotate: 'rotate',
  CornerRadius: 'cornerRadius',
} as const;

/** Star 示例的中文属性面板 */
export const starExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Star',
  sections: [
    {
      label: '星形几何',
      controls: [
        {
          kind: 'range',
          id: StarExampleControlId.Points,
          label: '尖角数量',
          defaultValue: 5,
          min: 3,
          max: 10,
          step: 1,
        },
        {
          kind: 'range',
          id: StarExampleControlId.InnerRadius,
          label: '内半径',
          defaultValue: 30,
          min: 14,
          max: 52,
          step: 2,
        },
        {
          kind: 'range',
          id: StarExampleControlId.OuterRadius,
          label: '外半径',
          defaultValue: 68,
          min: 54,
          max: 82,
          step: 2,
        },
        {
          kind: 'range',
          id: StarExampleControlId.Rotate,
          label: '旋转',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 5,
        },
        {
          kind: 'range',
          id: StarExampleControlId.CornerRadius,
          label: '圆角',
          defaultValue: 3,
          min: 0,
          max: 14,
          step: 1,
        },
      ],
    },
  ],
});

/** Star 示例的稳定文档契约 */
export const previewControlContract = {
  controls: starExampleControls,
  canonicalValues: { points: 5, innerRadius: 30, outerRadius: 68, rotate: 0, cornerRadius: 3 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
