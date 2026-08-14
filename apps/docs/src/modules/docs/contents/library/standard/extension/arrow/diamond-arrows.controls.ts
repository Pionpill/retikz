import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 菱形箭头使用的稳定字段 id */
export const DiamondArrowsControlId = {
  Color: 'color',
  Scale: 'scale',
  LineWidth: 'lineWidth',
} as const;

/** 菱形箭头的中文属性面板 */
export const diamondArrowsControls = definePreviewControls({
  presentation: 'panel',
  title: '菱形箭头',
  sections: [
    {
      label: '端点样式',
      controls: [
        { kind: 'color', id: DiamondArrowsControlId.Color, label: '颜色', defaultValue: '#ea580c' },
        {
          kind: 'range',
          id: DiamondArrowsControlId.Scale,
          label: '缩放',
          defaultValue: 1,
          min: 0.5,
          max: 2,
          step: 0.1,
        },
        {
          kind: 'range',
          id: DiamondArrowsControlId.LineWidth,
          label: '空心描边',
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
  canonicalValues: { color: '#ea580c', scale: 1, lineWidth: 1.5 },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
