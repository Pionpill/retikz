import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Bar 示例使用的稳定字段 id */
export const BarArrowControlId = { Length: 'length', Width: 'width', LineWidth: 'lineWidth', Color: 'color' } as const;

/** Bar 示例的中文属性面板 */
export const barArrowControls = definePreviewControls({
  presentation: 'panel',
  title: 'Bar 端点',
  sections: [
    {
      label: '端点参数',
      controls: [
        { kind: 'range', id: BarArrowControlId.Length, label: '长度', defaultValue: 10, min: 4, max: 20, step: 1 },
        { kind: 'range', id: BarArrowControlId.Width, label: '宽度', defaultValue: 14, min: 6, max: 24, step: 1 },
        {
          kind: 'range',
          id: BarArrowControlId.LineWidth,
          label: '描边宽度',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        { kind: 'color', id: BarArrowControlId.Color, label: '颜色', defaultValue: '#ea580c' },
      ],
    },
  ],
});

/** Bar 示例的稳定文档契约 */
export const previewControlContract = {
  controls: barArrowControls,
  canonicalValues: { length: 10, width: 14, lineWidth: 1.5, color: '#ea580c' },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
