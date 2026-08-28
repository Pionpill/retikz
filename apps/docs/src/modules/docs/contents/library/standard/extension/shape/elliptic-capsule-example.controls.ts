import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Elliptic Capsule 示例使用的稳定字段 id */
export const EllipticCapsuleExampleControlId = { Axis: 'axis', CapDepth: 'capDepth' } as const;

/** Elliptic Capsule 示例的中文属性面板 */
export const ellipticCapsuleExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '半椭圆端胶囊形',
  sections: [
    {
      label: '端部参数',
      controls: [
        {
          kind: 'select',
          id: EllipticCapsuleExampleControlId.Axis,
          label: '主轴',
          defaultValue: 'vertical',
          options: [
            { value: 'vertical', label: '垂直' },
            { value: 'horizontal', label: '水平' },
          ],
        },
        {
          kind: 'range',
          id: EllipticCapsuleExampleControlId.CapDepth,
          label: '端部深度',
          defaultValue: 8,
          min: 0,
          max: 28,
          step: 1,
        },
      ],
    },
  ],
});

/** Elliptic Capsule 示例的稳定文档契约 */
export const previewControlContract = {
  controls: ellipticCapsuleExampleControls,
  canonicalValues: { axis: 'vertical', capDepth: 8 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
