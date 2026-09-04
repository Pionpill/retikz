import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 端点重叠示例使用的稳定字段 id */
export const ArrowEndpointOverlapControlId = { Shape: 'shape', Overlap: 'overlap' } as const;

const shapeOptions = [
  { label: '实心三角', value: 'normal' },
  { label: '空心三角', value: 'open' },
  { label: '实心锐箭', value: 'stealth' },
  { label: '空心锐箭', value: 'openStealth' },
  { label: '实心圆点', value: 'circle' },
  { label: '空心圆点', value: 'openCircle' },
] as const;

/** 端点重叠示例的中文属性面板 */
export const arrowEndpointOverlapControls = definePreviewControls({
  presentation: 'panel',
  title: '端点重叠',
  sections: [
    {
      label: '箭头放置',
      controls: [
        {
          kind: 'select',
          id: ArrowEndpointOverlapControlId.Shape,
          label: '箭头形状',
          defaultValue: 'openCircle',
          options: shapeOptions,
        },
        {
          kind: 'range',
          id: ArrowEndpointOverlapControlId.Overlap,
          label: '进入比例',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 端点重叠示例的稳定文档契约 */
export const previewControlContract = {
  controls: arrowEndpointOverlapControls,
  canonicalValues: { shape: 'openCircle', overlap: 0.5 },
  relatedApis: ['Draw.arrowDetail', 'Draw.arrowPlacement'],
} satisfies PreviewControlContract;
