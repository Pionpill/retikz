import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 开放弧示例使用的稳定字段 id */
export const SectorOpenExampleControlId = {
  Radius: 'radius',
  StartAngle: 'startAngle',
  EndAngle: 'endAngle',
} as const;

/** 开放弧示例的中文属性面板 */
export const sectorOpenExampleControls = definePreviewControls({
  presentation: 'panel',
  title: '开放弧',
  sections: [
    {
      label: '几何',
      controls: [
        {
          kind: 'range',
          id: SectorOpenExampleControlId.Radius,
          label: '半径',
          defaultValue: 56,
          min: 24,
          max: 76,
          step: 2,
        },
        {
          kind: 'range',
          id: SectorOpenExampleControlId.StartAngle,
          label: '起始角',
          defaultValue: 30,
          min: 0,
          max: 300,
          step: 5,
        },
        {
          kind: 'range',
          id: SectorOpenExampleControlId.EndAngle,
          label: '结束角',
          defaultValue: 300,
          min: 60,
          max: 360,
          step: 5,
        },
      ],
    },
  ],
});

/** 开放弧示例的稳定文档契约 */
export const previewControlContract = {
  controls: sectorOpenExampleControls,
  canonicalValues: { radius: 56, startAngle: 30, endAngle: 300 },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
