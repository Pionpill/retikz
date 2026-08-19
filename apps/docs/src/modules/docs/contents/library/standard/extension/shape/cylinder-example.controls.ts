import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Cylinder 示例使用的稳定字段 id */
export const CylinderExampleControlId = { Axis: 'axis', CapDepth: 'capDepth' } as const;

/** Cylinder 示例的中文属性面板 */
export const cylinderExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '圆柱形',
  sections: [
    {
      label: '端盖参数',
      controls: [
        {
          kind: 'select',
          id: CylinderExampleControlId.Axis,
          label: '主轴',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: '垂直' },
            { value: 'horizontal', label: '水平' },
          ],
        },
        {
          kind: 'range',
          id: CylinderExampleControlId.CapDepth,
          label: '端盖深度',
          defaultValue: 12,
          min: 0,
          max: 28,
          step: 1,
        },
      ],
    },
  ],
});

/** Cylinder 示例的稳定文档契约 */
export const previewControlContract = {
  controls: cylinderExampleControls,
  canonicalValues: { axis: 'vertical', capDepth: 12 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
