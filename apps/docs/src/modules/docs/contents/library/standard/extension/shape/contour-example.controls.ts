import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Contour 示例使用的稳定字段 id */
export const ContourExampleControlId = {
  Preset: 'preset',
  CornerRadius: 'cornerRadius',
} as const;

/** Contour 示例的中文属性面板 */
export const contourExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Contour',
  sections: [
    {
      label: '轮廓',
      controls: [
        {
          kind: 'select',
          id: ContourExampleControlId.Preset,
          label: '顶点预设',
          defaultValue: 'tag',
          options: [
            { value: 'tag', label: '标签' },
            { value: 'shield', label: '盾牌' },
            { value: 'notch', label: '缺口' },
          ],
        },
        {
          kind: 'range',
          id: ContourExampleControlId.CornerRadius,
          label: '圆角',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 1,
        },
      ],
    },
  ],
});

/** Contour 示例的稳定文档契约 */
export const previewControlContract = {
  controls: contourExampleControls,
  canonicalValues: { preset: 'tag', cornerRadius: 8 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
