import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** CrowFoot 示例使用的稳定字段 id */
export const CrowFootArrowControlId = {
  Length: 'length',
  Width: 'width',
  LineWidth: 'lineWidth',
  Color: 'color',
} as const;

/** CrowFoot 示例的中文属性面板 */
export const crowFootArrowControls = definePreviewControls({
  presentation: 'panel',
  title: 'CrowFoot 端点',
  sections: [
    {
      label: '端点参数',
      controls: [
        { kind: 'range', id: CrowFootArrowControlId.Length, label: '长度', defaultValue: 12, min: 4, max: 24, step: 1 },
        { kind: 'range', id: CrowFootArrowControlId.Width, label: '宽度', defaultValue: 16, min: 6, max: 28, step: 1 },
        {
          kind: 'range',
          id: CrowFootArrowControlId.LineWidth,
          label: '描边宽度',
          defaultValue: 1.5,
          min: 0.5,
          max: 4,
          step: 0.5,
        },
        { kind: 'color', id: CrowFootArrowControlId.Color, label: '颜色', defaultValue: '#ea580c' },
      ],
    },
  ],
});

/** CrowFoot 示例的稳定文档契约 */
export const previewControlContract = {
  controls: crowFootArrowControls,
  canonicalValues: { length: 12, width: 16, lineWidth: 1.5, color: '#ea580c' },
  relatedApis: ['Layout.arrows', 'Draw.arrowDetail'],
} satisfies PreviewControlContract;
