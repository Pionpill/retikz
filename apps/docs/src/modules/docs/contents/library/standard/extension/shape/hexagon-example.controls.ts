import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Hexagon 示例使用的稳定字段 id */
export const HexagonExampleControlId = { ShoulderRatio: 'shoulderRatio', CornerRadius: 'cornerRadius' } as const;

/** Hexagon 示例的中文属性面板 */
export const hexagonExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '长六边形',
  sections: [
    {
      label: '肩部参数',
      controls: [
        {
          kind: 'range',
          id: HexagonExampleControlId.ShoulderRatio,
          label: '肩部比例',
          defaultValue: 0.2,
          min: 0.1,
          max: 0.4,
          step: 0.01,
        },
        {
          kind: 'range',
          id: HexagonExampleControlId.CornerRadius,
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

/** Hexagon 示例的稳定文档契约 */
export const previewControlContract = {
  controls: hexagonExampleControls,
  canonicalValues: { shoulderRatio: 0.2, cornerRadius: 4 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
